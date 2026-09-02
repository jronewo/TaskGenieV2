using FluentValidation;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed class CreateTaskCommandValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskCommandValidator(IProjectRepository projectRepo)
    {
        RuleFor(x => x)
            .Must(HaveValidDateOrder)
            .WithMessage("Start date must be on or before the deadline.");

        // Only refuses when the task actually has a deadline and its project has one too — a task
        // (or project) missing a deadline isn't cross-checked.
        RuleFor(x => x)
            .MustAsync((cmd, ct) => NotExceedProjectDeadlineAsync(cmd, projectRepo, ct))
            .WithMessage("Task deadline cannot be later than the project's deadline.");

        // A task cannot be scheduled to start after the project is already due — this catches the
        // case the deadline check misses, where the task carries a start date but no deadline of
        // its own.
        RuleFor(x => x)
            .MustAsync((cmd, ct) => StartNotAfterProjectDeadlineAsync(cmd, projectRepo, ct))
            .WithMessage("Task start date cannot be later than the project's deadline.");
    }

    /// <summary>Only refuses when both dates are present and out of order — a task can freely have
    /// just one of the two set.</summary>
    internal static bool HaveValidDateOrder(CreateTaskCommand cmd)
    {
        if (!DateOnly.TryParse(cmd.StartDate, out var start)) return true;
        if (!DateOnly.TryParse(cmd.Deadline, out var deadline)) return true;
        return start <= deadline;
    }

    internal static async Task<bool> NotExceedProjectDeadlineAsync(
        CreateTaskCommand cmd, IProjectRepository projectRepo, CancellationToken ct)
    {
        if (!DateOnly.TryParse(cmd.Deadline, out var taskDeadline)) return true;

        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
        if (project?.Deadline is null) return true;

        return taskDeadline <= project.Deadline.Value;
    }

    internal static async Task<bool> StartNotAfterProjectDeadlineAsync(
        CreateTaskCommand cmd, IProjectRepository projectRepo, CancellationToken ct)
    {
        if (!DateOnly.TryParse(cmd.StartDate, out var taskStart)) return true;

        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
        if (project?.Deadline is null) return true;

        return taskStart <= project.Deadline.Value;
    }
}
