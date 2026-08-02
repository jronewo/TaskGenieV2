using MediatR;
using Microsoft.Extensions.Logging;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Common.Agent;

/// <summary>
/// The project assistant. A message is matched against the declared skills in
/// <see cref="AssistantSkillRegistry"/>, and the matching skill calls the application's own use
/// cases — so the assistant's capabilities are a list you can read rather than a model's whim.
///
/// This replaced an LLM-backed agent deliberately. The model could interpret free-form language,
/// but it depended on a provider quota that never became available, so in practice it answered
/// nothing. Narrower and working beats broader and broken.
///
/// Everything still goes through MediatR under the signed-in user, so a project they cannot open is
/// a project the assistant cannot touch.
/// </summary>
public sealed class RuleBasedProjectAgent(
    IMediator mediator,
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ILogger<RuleBasedProjectAgent> logger
) : IProjectAgent
{
    public async System.Threading.Tasks.Task<AgentReply> RunAsync(
        string userMessage,
        int? projectId,
        CancellationToken ct = default)
    {
        var matched = AssistantSkillRegistry.Match(userMessage);
        if (matched is null) return new AgentReply(Capabilities(), []);

        var (skill, args) = matched.Value;
        var step = new AgentStep(skill.Id, string.Join(", ", skill.ApiCalls), "ok");

        try
        {
            // Read skills share one implementation: the intent decides the filter, and the row
            // reading plus its permission check happen once, here.
            var intent = AssistantSkillRegistry.DiagnosticIntentOf(skill);
            if (intent is DiagnosticIntent diagnostic)
            {
                return await AnswerDiagnosticAsync(diagnostic, skill, projectId, ct);
            }

            var answer = await skill.Execute(args, new SkillContext(mediator, currentUser.UserId, projectId), ct);
            return new AgentReply(answer, [step]);
        }
        catch (Exception ex)
        {
            // A refusal from the use case is the honest answer, not a stack trace.
            logger.LogInformation(ex, "Assistant skill {Skill} was refused.", skill.Id);
            return new AgentReply(
                $"Không thực hiện được: {ex.Message}",
                [step with { Result = ex.Message }]);
        }
    }

    private async System.Threading.Tasks.Task<AgentReply> AnswerDiagnosticAsync(
        DiagnosticIntent intent,
        AssistantSkill skill,
        int? projectId,
        CancellationToken ct)
    {
        List<Domain.Entities.Task> tasks;
        string scope;

        if (projectId is int id)
        {
            // Same authorization as opening the board: a project they cannot read stays unread.
            var project = await authz.EnsureCanAccessProjectAsync(id, ct);
            tasks = await taskRepo.GetByProjectIdWithDetailsAsync(id, ct);
            scope = project.Name;
        }
        else
        {
            // No project chosen: their own assigned work is the honest workspace-wide scope, since
            // reading every project would need a permission check per project.
            tasks = await taskRepo.GetByAssigneeAsync(currentUser.UserId, ct);
            scope = "công việc của bạn";
        }

        var answer = WorkspaceDiagnostics.Answer(intent, tasks, DateOnly.FromDateTime(DateTime.UtcNow), scope);

        return new AgentReply(
            string.IsNullOrWhiteSpace(answer) ? Capabilities() : answer,
            [new AgentStep(skill.Id, string.Join(", ", skill.ApiCalls), $"{tasks.Count} task(s) read")]);
    }

    /// <summary>Generated from the registry, so it can never drift from what actually works.</summary>
    private static string Capabilities()
    {
        var lines = AssistantSkillRegistry.All.Select(s => $"• {s.Title} — \"{s.Example}\"");
        return $"Tôi chưa hiểu câu đó. Những việc tôi làm được:\n{string.Join("\n", lines)}";
    }
}
