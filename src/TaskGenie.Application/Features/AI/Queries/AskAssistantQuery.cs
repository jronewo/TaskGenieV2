using FluentValidation;
using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.AI.Queries;

/// <summary>What the assistant was able to see when it answered, so the UI can show its scope.</summary>
public sealed record AssistantContext(int ProjectCount, int TaskCount, string? ProjectName);

public sealed record AssistantAnswer(string Answer, AssistantContext Context);

/// <summary>
/// A question about the caller's own work. Optionally scoped to one project.
/// </summary>
public sealed record AskAssistantQuery(string Question, int? ProjectId) : IRequest<AssistantAnswer>;

public sealed class AskAssistantQueryValidator : AbstractValidator<AskAssistantQuery>
{
    public AskAssistantQueryValidator()
    {
        RuleFor(q => q.Question)
            .NotEmpty().WithMessage("Ask a question first.")
            .MaximumLength(500).WithMessage("Keep the question under 500 characters.");
    }
}

/// <summary>
/// Answers from the caller's real rows only. A project scope goes through the same authorization
/// check as any other project read, and the unscoped path lists nothing but the caller's own
/// projects and assigned tasks — the assistant can never widen what its user is allowed to see.
/// </summary>
public sealed class AskAssistantQueryHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    IEntitlementService entitlements,
    IProjectRepository projectRepo,
    ITaskRepository taskRepo,
    ITextGenerationService textGeneration
) : IRequestHandler<AskAssistantQuery, AssistantAnswer>
{
    private const int MaxTasksInPrompt = 25;

    public async System.Threading.Tasks.Task<AssistantAnswer> Handle(AskAssistantQuery query, CancellationToken ct)
    {
        var userId = currentUser.UserId;

        // The assistant is a paid feature. Hiding the launcher in the UI is presentation only —
        // the endpoint is what actually has to refuse a free caller.
        var entitlement = await entitlements.GetForUserAsync(userId, ct);
        if (!entitlement.IsPremium)
        {
            throw new PlanUpgradeRequiredException(
                "AI chatbot chỉ có trong gói trả phí. Nâng cấp để sử dụng trợ lý.",
                limit: null,
                usage: 0);
        }

        List<TaskEntity> tasks;
        int projectCount;
        string? projectName = null;

        if (query.ProjectId is int projectId)
        {
            var project = await authz.EnsureCanAccessProjectAsync(projectId, ct);
            projectName = project.Name;
            projectCount = 1;
            tasks = await taskRepo.GetByProjectIdAsync(projectId, ct);
        }
        else
        {
            var projects = await projectRepo.GetProjectsByUserIdAsync(userId, ct);
            projectCount = projects.Count;
            tasks = await taskRepo.GetByAssigneeAsync(userId, ct);
        }

        var context = new AssistantContext(projectCount, tasks.Count, projectName);
        var prompt = BuildPrompt(query.Question, projectName, tasks);

        string answer;
        try
        {
            answer = await textGeneration.GenerateTextAsync(prompt, maxTokens: 220);
        }
        catch (Exception)
        {
            // The provider being down is not a reason to fail the request outright; the caller still
            // gets the deterministic summary below, which is drawn from their own rows.
            answer = string.Empty;
        }

        if (string.IsNullOrWhiteSpace(answer))
        {
            answer = Fallback(tasks, projectName);
        }

        return new AssistantAnswer(answer.Trim(), context);
    }

    private static string BuildPrompt(string question, string? projectName, IReadOnlyList<TaskEntity> tasks)
    {
        var scope = projectName is null ? "their assigned work" : $"the project '{projectName}'";
        var lines = tasks
            .Take(MaxTasksInPrompt)
            .Select(t => $"- {t.Title} [{t.Status}, priority {t.Priority}, risk {t.RiskLevel}, {t.Progress}% done]");

        return $"""
            You are a project assistant. Answer the user's question about {scope} using only the
            task list below. Be concise and specific. If the list does not contain the answer, say so.

            Tasks ({tasks.Count} total, showing up to {MaxTasksInPrompt}):
            {string.Join("\n", lines)}

            Question: {question}
            Answer:
            """;
    }

    /// <summary>Deterministic answer used when the AI provider is unavailable.</summary>
    private static string Fallback(IReadOnlyList<TaskEntity> tasks, string? projectName)
    {
        if (tasks.Count == 0)
        {
            return projectName is null
                ? "You have no tasks assigned yet."
                : $"'{projectName}' has no tasks yet.";
        }

        var done = tasks.Count(t => t.Status == "Done");
        var inProgress = tasks.Count(t => t.Status == "InProgress");
        var highRisk = tasks.Count(t => string.Equals(t.RiskLevel, "HIGH", StringComparison.OrdinalIgnoreCase));
        var scope = projectName is null ? "You have" : $"'{projectName}' has";

        return $"The AI provider is unavailable, so here is the raw picture: {scope} {tasks.Count} task(s) — " +
               $"{done} done, {inProgress} in progress, {highRisk} at high risk.";
    }
}
