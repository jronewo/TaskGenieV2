using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record CreateTaskCommand(
    int ProjectId,
    string Title,
    string? Description,
    string? Priority,
    string? Deadline,
    string? StartDate,
    int? Difficulty,
    /// <summary>Which kind of work this is; null keeps the task unclassified.</summary>
    int? TaskTypeId = null
) : IRequest<TaskDetailDto>;

public sealed class CreateTaskCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    IMediator mediator
) : IRequestHandler<CreateTaskCommand, TaskDetailDto>
{
    public async Task<TaskDetailDto> Handle(CreateTaskCommand cmd, CancellationToken ct)
    {
        await authz.EnsureCanManageTasksInProjectAsync(cmd.ProjectId, ct);

        var task = TaskEntity.Create(
            projectId: cmd.ProjectId,
            title: cmd.Title,
            description: cmd.Description,
            priority: cmd.Priority ?? "Medium",
            deadline: !string.IsNullOrEmpty(cmd.Deadline) && DateOnly.TryParse(cmd.Deadline, out var dl) ? dl : null,
            startDate: !string.IsNullOrEmpty(cmd.StartDate) && DateOnly.TryParse(cmd.StartDate, out var sd) ? sd : null,
            difficulty: cmd.Difficulty,
            createdBy: currentUser.UserId
        );

        task.SetTaskType(cmd.TaskTypeId);

        await taskRepo.AddAsync(task, ct);

        await mediator.Publish(
            new TaskCreatedEvent(task.TaskId, cmd.ProjectId, task.Title, currentUser.UserId),
            ct);

        var full = await taskRepo.GetByIdWithDetailsAsync(task.TaskId, ct);
        return full is not null ? TaskDetailDto.FromEntity(full) : TaskDetailDto.FromEntity(task);
    }
}
