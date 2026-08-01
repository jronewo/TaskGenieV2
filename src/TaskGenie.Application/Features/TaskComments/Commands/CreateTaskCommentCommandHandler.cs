using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Features.TaskComments;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.TaskComments.Commands;

public class CreateTaskCommentCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    ITaskCommentRepository taskCommentRepository,
    ITaskRepository taskRepository,
    IMediator mediator)
    : IRequestHandler<CreateTaskCommentCommand, TaskCommentDto>
{
    public async Task<TaskCommentDto> Handle(CreateTaskCommentCommand request, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(request.TaskId, ct);

        var comment = TaskComment.Create(request.TaskId, currentUser.UserId, request.Content, request.ImageUrl);
        await taskCommentRepository.AddAsync(comment, ct);

        var newComment = await taskCommentRepository.GetByIdAsync(comment.CommentId, ct)
            ?? throw new NotFoundException(nameof(TaskComment), comment.CommentId);

        // Send notifications (best effort)
        try
        {
            var assignees = await taskRepository.GetTaskAssigneesAsync(request.TaskId, ct);
            var task = await taskRepository.GetByIdAsync(request.TaskId, ct);
            var commenterName = newComment.User?.Name ?? "Ai đó";
            var taskTitle = task?.Title ?? $"Task #{request.TaskId}";
            var contentPreview = request.Content?.Length > 80
                ? request.Content[..80] + "..."
                : request.Content ?? "📷 Ảnh đính kèm";

            foreach (var assignee in assignees)
            {
                if (assignee.UserId != currentUser.UserId && assignee.UserId.HasValue)
                {
                    await mediator.Send(new CreateNotificationCommand(
                        assignee.UserId.Value,
                        "COMMENT",
                        $"Bình luận mới trên \"{taskTitle}\"",
                        $"{commenterName} đã bình luận: {contentPreview}",
                        request.TaskId,
                        "TASK"), ct);
                }
            }

            if (task?.CreatedBy != null
                && task.CreatedBy != currentUser.UserId
                && !assignees.Any(a => a.UserId == task.CreatedBy))
            {
                await mediator.Send(new CreateNotificationCommand(
                    task.CreatedBy.Value,
                    "COMMENT",
                    $"Bình luận mới trên \"{taskTitle}\"",
                    $"{commenterName} đã bình luận: {contentPreview}",
                    request.TaskId,
                    "TASK"), ct);
            }
        }
        catch
        {
            // Notification failure must not abort comment creation
        }

        return new TaskCommentDto
        {
            CommentId = newComment.CommentId,
            TaskId = newComment.TaskId,
            UserId = newComment.UserId,
            UserName = newComment.User?.Name,
            UserAvatar = newComment.User?.Avatar,
            Content = newComment.Content,
            ImageUrl = newComment.ImageUrl,
            CreatedAt = newComment.CreatedAt
        };
    }
}
