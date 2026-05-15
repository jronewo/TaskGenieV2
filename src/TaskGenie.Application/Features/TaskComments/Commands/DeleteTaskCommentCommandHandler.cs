using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.TaskComments.Commands;

public class DeleteTaskCommentCommandHandler(ITaskCommentRepository taskCommentRepository)
    : IRequestHandler<DeleteTaskCommentCommand, bool>
{
    public async Task<bool> Handle(DeleteTaskCommentCommand request, CancellationToken ct)
    {
        var comment = await taskCommentRepository.GetByIdAsync(request.CommentId, ct)
            ?? throw new NotFoundException("TaskComment", request.CommentId);

        await taskCommentRepository.DeleteAsync(request.CommentId, ct);
        return true;
    }
}
