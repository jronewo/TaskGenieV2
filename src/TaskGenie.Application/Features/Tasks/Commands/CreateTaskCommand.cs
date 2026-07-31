using MediatR;
using TaskGenie.Application.Common;
using TaskGenie.Application.Events;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Features.Tasks.Commands;

public sealed record CreateTaskCommand(
    int ProjectId,
    string Title,
    string? Description,
    string? Priority,
    string? Deadline,
    int? Difficulty,
    int CurrentUserId
) : IRequest<TaskDetailDto>;

public sealed class CreateTaskCommandHandler(
    ITaskRepository taskRepo,
    IMediator mediator
) : IRequestHandler<CreateTaskCommand, TaskDetailDto>
{
    public async Task<TaskDetailDto> Handle(CreateTaskCommand cmd, CancellationToken ct)
    {
        var task = TaskEntity.Create(
            projectId: cmd.ProjectId,
            title: cmd.Title,
            description: cmd.Description,
            priority: cmd.Priority ?? "Medium",
            deadline: DateOnlyParser.TryParseFlexible(cmd.Deadline),
            difficulty: cmd.Difficulty,
            createdBy: cmd.CurrentUserId
        );

        await taskRepo.AddAsync(task, ct);

        await mediator.Publish(
            new TaskCreatedEvent(task.TaskId, cmd.ProjectId, task.Title, cmd.CurrentUserId),
            ct);

        var full = await taskRepo.GetByIdWithDetailsAsync(task.TaskId, ct);
        return full is not null ? TaskDetailDto.FromEntity(full) : TaskDetailDto.FromEntity(task);
    }
}
