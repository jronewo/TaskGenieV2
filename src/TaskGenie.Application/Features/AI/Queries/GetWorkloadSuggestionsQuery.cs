using System.Text;
using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Queries;

public sealed record GetWorkloadSuggestionsQuery(int ProjectId) : IRequest<WorkloadSuggestionDto>;

public sealed class GetWorkloadSuggestionsQueryHandler(
    IResourceAuthorizationService authz,
    IUserRepository userRepo,
    ITaskRepository taskRepo,
    ITextGenerationService textGenService
) : IRequestHandler<GetWorkloadSuggestionsQuery, WorkloadSuggestionDto>
{
    public async Task<WorkloadSuggestionDto> Handle(GetWorkloadSuggestionsQuery query, CancellationToken ct)
    {
        // BUG FIX: get project first, then use project.TeamId — NOT projectId — to get team members
        var project = await authz.EnsureCanAccessProjectAsync(query.ProjectId, ct);

        List<TaskGenie.Domain.Entities.User> teamMembers;
        if (project.TeamId.HasValue)
            teamMembers = await userRepo.GetByTeamIdAsync(project.TeamId.Value, ct);
        else
            teamMembers = await userRepo.GetAllAsync(ct);

        var pendingTasks = await taskRepo.GetByProjectIdAsync(query.ProjectId, ct);
        var activeTasks = pendingTasks
            .Where(t => !string.IsNullOrEmpty(t.Status) && t.Status != "Done")
            .Take(5)
            .ToList();

        if (teamMembers.Count == 0 || activeTasks.Count == 0)
            return new WorkloadSuggestionDto { ProjectId = query.ProjectId };

        var promptBuilder = new StringBuilder();
        promptBuilder.AppendLine("Task distribution suggestion.");
        promptBuilder.AppendLine("Available Users:");
        foreach (var u in teamMembers) promptBuilder.AppendLine($"- {u.Name}");
        promptBuilder.AppendLine("\nPending Tasks:");
        foreach (var t in activeTasks)
            promptBuilder.AppendLine($"- {t.Title} (Priority: {t.Priority})");
        promptBuilder.AppendLine("\nSuggest assignees for these tasks:");

        string resultText;
        try { resultText = await textGenService.GenerateTextAsync(promptBuilder.ToString(), maxTokens: 200); }
        catch { resultText = "AI service unavailable. Please distribute tasks manually based on workload."; }

        return new WorkloadSuggestionDto
        {
            ProjectId = query.ProjectId,
            Suggestions = new List<WorkloadSuggestionItemDto>
            {
                new WorkloadSuggestionItemDto
                {
                    UserId = 0,
                    UserName = "AI Workload Analysis",
                    SuggestedTasks = new List<string>(),
                    Reason = resultText
                }
            }
        };
    }
}
