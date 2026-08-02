using FluentValidation;
using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Application.Features.Projects.Commands;

/// <summary>
/// Sets how many hours a day this project expects from a member. It feeds the capacity side of the
/// risk estimate, so a school project running two hours an evening stops being measured against a
/// full company shift.
/// </summary>
public sealed record SetProjectWorkingHoursCommand(int ProjectId, int WorkingHoursPerDay) : IRequest<int>;

public sealed class SetProjectWorkingHoursCommandValidator : AbstractValidator<SetProjectWorkingHoursCommand>
{
    public SetProjectWorkingHoursCommandValidator()
    {
        RuleFor(c => c.WorkingHoursPerDay)
            .InclusiveBetween(1, 24)
            .WithMessage("Working hours per day must be between 1 and 24.");
    }
}

public sealed class SetProjectWorkingHoursCommandHandler(
    IResourceAuthorizationService authz,
    IProjectRepository projectRepo
) : IRequestHandler<SetProjectWorkingHoursCommand, int>
{
    public async Task<int> Handle(SetProjectWorkingHoursCommand cmd, CancellationToken ct)
    {
        // Leader-level authority: the same people who may add and edit tasks, and nobody else.
        var project = await authz.EnsureCanManageTasksInProjectAsync(cmd.ProjectId, ct);

        project.SetWorkingHoursPerDay(cmd.WorkingHoursPerDay);
        await projectRepo.UpdateAsync(project, ct);

        return cmd.WorkingHoursPerDay;
    }
}
