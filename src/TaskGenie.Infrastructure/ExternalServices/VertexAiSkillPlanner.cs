using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>
/// Reads what a sentence is asking for, using Gemini on Vertex AI.
///
/// The model is given the assistant's skills as callable functions and asked to pick one. It never
/// reaches the database or an API: it returns a name and some arguments, and the caller decides
/// whether that name is a skill it is willing to run. A model that answers nonsense produces a
/// refused lookup, not an unintended write.
/// </summary>
public sealed class VertexAiSkillPlanner(HttpClient http, IConfiguration configuration, ILogger<VertexAiSkillPlanner> logger)
    : VertexAiClient(http, configuration, logger), ISkillPlanner
{
    private const string NoMatch = "no_match";

    public async Task<SkillPlan?> PlanAsync(
        string message,
        IReadOnlyList<PlannerSkill> candidates,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message) || candidates.Count == 0) return null;

        var json = await GenerateAsync(BuildRequest(message, candidates), ct);
        return ReadPlan(json, candidates);
    }

    /// <summary>
    /// Declares each skill as a function the model may call.
    ///
    /// Mode ANY forces a choice among the declared functions, so the model cannot reply with prose
    /// that the caller would then have to parse. "no_match" is offered as one of those functions —
    /// without it, forcing a choice would make every unrelated sentence pick some real skill.
    /// </summary>
    private static object BuildRequest(string message, IReadOnlyList<PlannerSkill> candidates)
    {
        var declarations = candidates
            .Select(skill => new
            {
                name = skill.Id.Replace('-', '_'),
                description = skill.Description,
                parameters = new
                {
                    type = "object",
                    properties = skill.Arguments.ToDictionary(
                        argument => argument.Key,
                        argument => (object)new { type = "string", description = argument.Value }),
                },
            })
            .Cast<object>()
            .ToList();

        declarations.Add(new
        {
            name = NoMatch,
            description = "Câu này không thuộc việc nào ở trên, hoặc quá mơ hồ để chắc chắn.",
            parameters = new { type = "object", properties = new Dictionary<string, object>() },
        });

        return new
        {
            systemInstruction = new
            {
                parts = new[]
                {
                    new
                    {
                        text =
                            "Bạn phân loại câu của người dùng vào đúng một chức năng quản lý công việc. " +
                            "Chỉ trích xuất thông tin có thật trong câu; không suy đoán và không tự bịa tên, " +
                            "ngày tháng hay mã số. Nếu thiếu thông tin bắt buộc, cứ chọn chức năng đó và bỏ " +
                            $"trống tham số — người gọi sẽ hỏi lại. Không chắc thì chọn {NoMatch}.",
                    },
                },
            },
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = message } } },
            },
            tools = new[] { new { functionDeclarations = declarations } },
            toolConfig = new { functionCallingConfig = new { mode = "ANY" } },
            // Zero temperature: the same sentence should route the same way every time. This is a
            // classification, and a bot that files the same request differently twice is a bug.
            generationConfig = new { temperature = 0.0, candidateCount = 1 },
        };
    }

    /// <summary>
    /// Reads the chosen function back, and refuses anything that is not a skill we offered — the
    /// model is a source of suggestions, never of capabilities.
    /// </summary>
    private SkillPlan? ReadPlan(JsonNode? json, IReadOnlyList<PlannerSkill> candidates)
    {
        var call = json?["candidates"]?[0]?["content"]?["parts"]
            ?.AsArray()
            .Select(part => part?["functionCall"])
            .FirstOrDefault(functionCall => functionCall is not null);

        var name = call?["name"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(name) || name == NoMatch) return null;

        // Function names cannot carry '-', so ids were sent with '_'. Match on the mangled form
        // rather than un-mangling, so a skill id containing '_' can never be confused with one
        // containing '-'.
        var skill = candidates.FirstOrDefault(c => c.Id.Replace('-', '_') == name);
        if (skill is null)
        {
            logger.LogWarning("Vertex AI chose {Name}, which is not a declared skill.", name);
            return null;
        }

        var arguments = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (call?["args"] is JsonObject args)
        {
            foreach (var (key, value) in args)
            {
                // Only the arguments the skill declared: an extra key is the model improvising, and
                // a skill that never asked for it has no business receiving it.
                if (!skill.Arguments.ContainsKey(key)) continue;

                var text = value switch
                {
                    null => null,
                    JsonValue v when v.TryGetValue<string>(out var s) => s,
                    _ => value.ToJsonString().Trim('"'),
                };
                if (!string.IsNullOrWhiteSpace(text)) arguments[key] = text;
            }
        }

        return new SkillPlan(skill.Id, arguments);
    }
}
