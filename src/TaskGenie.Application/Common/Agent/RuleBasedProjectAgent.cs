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
/// An earlier LLM-backed version was removed because it depended on a provider quota that never
/// arrived, leaving the assistant answering nothing at all. The model is back, but only where that
/// failure is survivable: it reads intent when no pattern matches, and it chooses among these same
/// declared skills. It cannot invent a capability, so the blast radius is still this file.
///
/// Everything still goes through MediatR under the signed-in user, so a project they cannot open is
/// a project the assistant cannot touch.
/// </summary>
public sealed class RuleBasedProjectAgent(
    IMediator mediator,
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ILogger<RuleBasedProjectAgent> logger,
    ISkillPlanner? planner = null,
    ITaskQueryPlanner? queryPlanner = null
) : IProjectAgent
{
    /// <summary>
    /// Asks the planner which skill the sentence wants.
    ///
    /// A planner that is down must not take the assistant with it: the patterns still work, so a
    /// failure here falls back to "I did not understand" rather than an error page. That is the
    /// same failure the user would have seen before the planner existed.
    /// </summary>
    private async System.Threading.Tasks.Task<(AssistantSkill Skill, SkillArgs Args)?> PlanAsync(
        string userMessage,
        CancellationToken ct)
    {
        try
        {
            var plan = await planner!.PlanAsync(userMessage, AssistantSkillRegistry.ForPlanner(), ct);
            if (plan is null) return null;

            var skill = AssistantSkillRegistry.ById(plan.SkillId);
            if (skill is null)
            {
                logger.LogWarning("Planner chose unknown skill {SkillId}.", plan.SkillId);
                return null;
            }

            logger.LogInformation("Planner routed a message to {SkillId}.", skill.Id);
            return (skill, SkillArgs.FromModel(plan.Arguments));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Planner unavailable; falling back to patterns only.");
            return null;
        }
    }

    public async System.Threading.Tasks.Task<AgentReply> RunAsync(
        string userMessage,
        int? projectId,
        CancellationToken ct = default)
    {
        var matched = AssistantSkillRegistry.Match(userMessage);

        // Patterns first: they cost nothing and they are exact. The planner is for the sentences
        // they were never written to catch — "thêm việc sửa lỗi login cho tôi đi" asks for the same
        // thing as "tạo task tên là Sửa lỗi login", but only one of them is shaped like the regex.
        if (matched is null && planner is not null)
        {
            matched = await PlanAsync(userMessage, ct);
        }

        // Last resort: not a command, not one of the six canned questions, but still a question
        // about tasks. The model is asked for filters over a fixed field list, never for rows
        // themselves — TaskQueryAsync reads exactly the same permission-scoped tasks the canned
        // diagnostics read, and the query only narrows which of those the person sees.
        if (matched is null && queryPlanner is not null)
        {
            var freeform = await AnswerFreeformQuestionAsync(userMessage, projectId, ct);
            if (freeform is not null) return freeform;
        }

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
        var (tasks, scope) = await ScopedTasksAsync(projectId, ct);
        var answer = WorkspaceDiagnostics.Answer(intent, tasks, DateOnly.FromDateTime(DateTime.UtcNow), scope);

        return new AgentReply(
            string.IsNullOrWhiteSpace(answer) ? Capabilities() : answer,
            [new AgentStep(skill.Id, string.Join(", ", skill.ApiCalls), $"{tasks.Count} task(s) read")]);
    }

    /// <summary>
    /// Answers a question no pattern and no canned diagnostic recognised, by asking the model for
    /// filters instead of an answer.
    ///
    /// The model never receives a row of data and never decides whose tasks are in play — it only
    /// names fields and comparisons from a closed enum, which <see cref="TaskQuery.Apply"/> runs
    /// over rows already scoped by <see cref="ScopedTasksAsync"/>. A wrong or nonsense query still
    /// only narrows or empties that same permitted set; it cannot widen it.
    ///
    /// Returns null when the sentence does not read as a task question at all, so the caller falls
    /// through to the same "I did not understand" as before this existed.
    /// </summary>
    private async System.Threading.Tasks.Task<AgentReply?> AnswerFreeformQuestionAsync(
        string userMessage, int? projectId, CancellationToken ct)
    {
        TaskQuery? plan;
        try
        {
            plan = await queryPlanner!.PlanAsync(userMessage, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Task query planner unavailable; falling back to canned answers.");
            return null;
        }

        if (plan is null) return null;

        var (tasks, scope) = await ScopedTasksAsync(projectId, ct);
        var matches = plan.Apply(tasks, DateOnly.FromDateTime(DateTime.UtcNow));

        var answer = matches.Count == 0
            ? $"Không có công việc nào khớp trong {scope}."
            : $"Trong {scope} ({matches.Count} kết quả):\n"
              + string.Join("\n", matches.Select(t => $"• #{t.TaskId} {t.Title} ({t.Status})"));

        return new AgentReply(answer, [new AgentStep("freeform-query", "TaskQuery.Apply", $"{tasks.Count} task(s) read, {matches.Count} matched")]);
    }

    /// <summary>The same permission-scoped read every diagnostic and free-form question runs over.</summary>
    private async System.Threading.Tasks.Task<(List<Domain.Entities.Task> Tasks, string Scope)> ScopedTasksAsync(
        int? projectId, CancellationToken ct)
    {
        if (projectId is int id)
        {
            // Same authorization as opening the board: a project they cannot read stays unread.
            var project = await authz.EnsureCanAccessProjectAsync(id, ct);
            return (await taskRepo.GetByProjectIdWithDetailsAsync(id, ct), project.Name);
        }

        // No project chosen: their own assigned work is the honest workspace-wide scope, since
        // reading every project would need a permission check per project.
        return (await taskRepo.GetByAssigneeAsync(currentUser.UserId, ct), "công việc của bạn");
    }

    /// <summary>Generated from the registry, so it can never drift from what actually works.</summary>
    private static string Capabilities()
    {
        var lines = AssistantSkillRegistry.All.Select(s => $"• {s.Title} — \"{s.Example}\"");
        return $"Tôi chưa hiểu câu đó. Những việc tôi làm được:\n{string.Join("\n", lines)}";
    }
}
