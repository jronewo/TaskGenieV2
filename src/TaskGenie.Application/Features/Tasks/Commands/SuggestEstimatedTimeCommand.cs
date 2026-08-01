using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record SuggestEstimatedTimeCommand(int TaskId) : IRequest<TaskDetailDto?>;

public sealed class SuggestEstimatedTimeCommandHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITextGenerationService textGenService
) : IRequestHandler<SuggestEstimatedTimeCommand, TaskDetailDto?>
{
    public async Task<TaskDetailDto?> Handle(SuggestEstimatedTimeCommand cmd, CancellationToken ct)
    {
        var task = await authz.EnsureCanManageTaskAsync(cmd.TaskId, ct);
        if (task.ProjectId is null) return null;

        var prompt = $"Estimate the time required in hours for this task based on its title and description. " +
                     $"Ensure you output a single number representing hours.\n" +
                     $"Title: {task.Title}\n" +
                     $"Description: {task.Description}\n" +
                     $"Difficulty (1-10): {task.Difficulty}";

        int hours;
        try
        {
            var aiResponse = await textGenService.GenerateTextAsync(prompt, maxTokens: 10);
            var match = System.Text.RegularExpressions.Regex.Match(aiResponse, @"\d+");
            hours = match.Success && int.TryParse(match.Value, out var parsed) ? parsed : 4;
        }
        catch
        {
            // Deterministic fallback is explicit and based on task difficulty.
            hours = Math.Clamp((task.Difficulty ?? 2) * 2, 2, 40);
        }

        task.SetAiEstimatedTime(hours);
        await taskRepo.UpdateAsync(task, ct);

        var full = await taskRepo.GetByIdWithDetailsAsync(cmd.TaskId, ct);
        return full is not null ? TaskDetailDto.FromEntity(full) : null;
    }
}
