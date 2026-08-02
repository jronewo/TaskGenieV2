using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.TaskComments.Commands;

public class DeleteTaskCommentCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authz,
    ITaskCommentRepository taskCommentRepository)
    : IRequestHandler<DeleteTaskCommentCommand, bool>
{
    public async Task<bool> Handle(DeleteTaskCommentCommand request, CancellationToken ct)
    {
        var comment = await taskCommentRepository.GetByIdAsync(request.CommentId, ct)
            ?? throw new NotFoundException("TaskComment", request.CommentId);

        var isAuthor = comment.UserId == currentUser.UserId;
        if (!isAuthor)
        {
            if (comment.TaskId is not int taskId)
                throw new ForbiddenException("You do not have permission to delete this comment.");

            // Not the author: only someone who can manage the task (project creator, org owner,
            // team LEADER, or PLATFORM_ADMIN) may delete it.
            await authz.EnsureCanManageTaskAsync(taskId, ct);
        }

        await taskCommentRepository.DeleteAsync(request.CommentId, ct);
        return true;
    }
}
