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

        var prompt = "Estimate this software task from its title and description. " +
                     "Answer with exactly two numbers separated by a space: hours, then difficulty on a 1-5 scale. " +
                     "Example answer: 12 3\n" +
                     $"Title: {task.Title}\n" +
                     $"Description: {task.Description}";

        int hours;
        int difficulty;
        try
        {
            var aiResponse = await textGenService.GenerateTextAsync(prompt, maxTokens: 16);
            var numbers = System.Text.RegularExpressions.Regex.Matches(aiResponse, @"\d+");
            hours = numbers.Count > 0 && int.TryParse(numbers[0].Value, out var h) ? h : FallbackHours(task);
            difficulty = numbers.Count > 1 && int.TryParse(numbers[1].Value, out var d)
                ? d
                : DifficultyFromHours(hours);
        }
        catch
        {
            // Deterministic fallback, so an unavailable model still produces a usable estimate.
            hours = FallbackHours(task);
            difficulty = DifficultyFromHours(hours);
        }

        hours = Math.Clamp(hours, 1, 200);
        task.SetAiEstimatedTime(hours);
        task.SuggestDifficulty(difficulty);
        await taskRepo.UpdateAsync(task, ct);

        var full = await taskRepo.GetByIdWithDetailsAsync(cmd.TaskId, ct);
        return full is not null ? TaskDetailDto.FromEntity(full) : null;
    }

    /// <summary>
    /// How much work the description itself implies. A one-line task and a task with a page of
    /// acceptance criteria are not the same size, and that is knowable without a model.
    /// </summary>
    private static int FallbackHours(TaskEntity task)
    {
        if (task.Difficulty is int declared) return Math.Clamp(declared * 4, 2, 40);

        var words = (task.Description ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        return words switch
        {
            0 => 4,
            < 15 => 4,
            < 60 => 8,
            < 150 => 16,
            _ => 24
        };
    }

    private static int DifficultyFromHours(int hours) => hours switch
    {
        <= 2 => 1,
        <= 6 => 2,
        <= 16 => 3,
        <= 32 => 4,
        _ => 5
    };
}
