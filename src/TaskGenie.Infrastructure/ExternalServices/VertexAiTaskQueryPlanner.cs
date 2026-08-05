using System.Text.Json.Nodes;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Common.Agent;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>
/// Turns a free-form question about tasks into a <see cref="TaskQuery"/>, using Gemini's structured
/// output rather than free text: the response schema enumerates exactly the fields and comparisons
/// <see cref="TaskField"/> and <see cref="Comparison"/> declare, so the model is constrained to the
/// same closed vocabulary the caller already validates against. It cannot express a filter that
/// TaskQuery.Apply does not already know how to run safely over rows the caller supplies.
/// </summary>
public sealed class VertexAiTaskQueryPlanner(
    HttpClient http, IConfiguration configuration, ILogger<VertexAiTaskQueryPlanner> logger)
    : VertexAiClient(http, configuration, logger), ITaskQueryPlanner
{
    private static readonly string[] FieldNames = Enum.GetNames<TaskField>();
    private static readonly string[] ComparisonNames = Enum.GetNames<Comparison>();

    public async Task<TaskQuery?> PlanAsync(string question, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(question)) return null;

        var json = await GenerateAsync(BuildRequest(question), ct);
        return ReadQuery(json);
    }

    private static object BuildRequest(string question) => new
    {
        systemInstruction = new
        {
            parts = new[]
            {
                new
                {
                    text =
                        "Bạn dịch câu hỏi về công việc (task) thành bộ lọc JSON theo đúng schema. " +
                        "isTaskQuestion=false nếu câu không hỏi về công việc/dự án. " +
                        "Field Deadline là SỐ NGUYÊN lệch so với hôm nay: âm là đã qua, dương là còn " +
                        "bao nhiêu ngày nữa — \"đang trễ hạn\" là Deadline LessThan 0, \"còn 5 ngày\" " +
                        "là Deadline LessOrEqual 5. Field CreatedAt/CompletedAt dùng yyyy-MM-dd. " +
                        "AssigneeCount là số người được giao — 0 nghĩa là chưa giao cho ai. " +
                        "Không suy đoán giá trị không có trong câu; bỏ trống filters nếu câu không " +
                        "nói rõ điều kiện. limit tối đa " + TaskQuery.MaxLimit + ".",
                },
            },
        },
        contents = new[]
        {
            new { role = "user", parts = new[] { new { text = question } } },
        },
        generationConfig = new
        {
            temperature = 0.0,
            candidateCount = 1,
            responseMimeType = "application/json",
            responseSchema = new
            {
                type = "OBJECT",
                properties = new
                {
                    isTaskQuestion = new { type = "BOOLEAN" },
                    filters = new
                    {
                        type = "ARRAY",
                        items = new
                        {
                            type = "OBJECT",
                            properties = new
                            {
                                field = new { type = "STRING", @enum = FieldNames },
                                comparison = new { type = "STRING", @enum = ComparisonNames },
                                value = new { type = "STRING" },
                            },
                            required = new[] { "field", "comparison" },
                        },
                    },
                    sortBy = new { type = "STRING", @enum = FieldNames.Append("None").ToArray() },
                    sortDescending = new { type = "BOOLEAN" },
                    limit = new { type = "INTEGER" },
                },
                required = new[] { "isTaskQuestion", "filters", "sortDescending", "limit" },
            },
        },
    };

    /// <summary>
    /// Every field and comparison here was already constrained by the response schema, so this is
    /// a parse of known-good tokens, not a trust boundary — the boundary was the schema itself.
    /// What still needs checking is shape (is this actually the JSON we asked for) and range (does
    /// limit fit), because the model can format things oddly even inside an allowed vocabulary.
    /// </summary>
    private TaskQuery? ReadQuery(JsonNode? json)
    {
        var text = json?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(text))
        {
            logger.LogWarning("Vertex AI returned no text for a task query question.");
            return null;
        }

        JsonNode? body;
        try
        {
            body = JsonNode.Parse(text);
        }
        catch (System.Text.Json.JsonException ex)
        {
            logger.LogWarning(ex, "Vertex AI's task query response was not valid JSON.");
            return null;
        }

        if (body?["isTaskQuestion"]?.GetValue<bool>() != true) return null;

        var filters = (body["filters"] as JsonArray ?? [])
            .Select(ReadFilter)
            .Where(filter => filter is not null)
            .Select(filter => filter!)
            .ToList();

        var sortByText = body["sortBy"]?.GetValue<string>();
        TaskField? sortBy = sortByText is not null && Enum.TryParse<TaskField>(sortByText, out var field)
            ? field
            : null;

        var limit = body["limit"]?.GetValue<int>() ?? TaskQuery.MaxLimit;
        var descending = body["sortDescending"]?.GetValue<bool>() ?? false;

        return new TaskQuery(filters, sortBy, descending, limit <= 0 ? TaskQuery.MaxLimit : limit);
    }

    private static TaskFilter? ReadFilter(JsonNode? node)
    {
        var fieldText = node?["field"]?.GetValue<string>();
        var comparisonText = node?["comparison"]?.GetValue<string>();
        if (fieldText is null || comparisonText is null) return null;
        if (!Enum.TryParse<TaskField>(fieldText, out var field)) return null;
        if (!Enum.TryParse<Comparison>(comparisonText, out var comparison)) return null;

        return new TaskFilter(field, comparison, node?["value"]?.GetValue<string>());
    }
}
