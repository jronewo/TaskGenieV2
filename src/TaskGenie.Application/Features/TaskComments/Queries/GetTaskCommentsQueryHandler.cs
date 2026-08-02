using MediatR;
using TaskGenie.Application.Features.TaskComments;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.TaskComments.Queries;

public class GetTaskCommentsQueryHandler(IResourceAuthorizationService authz, ITaskCommentRepository taskCommentRepository)
    : IRequestHandler<GetTaskCommentsQuery, List<TaskCommentDto>>
{
    public async Task<List<TaskCommentDto>> Handle(GetTaskCommentsQuery request, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(request.TaskId, ct);

        var comments = await taskCommentRepository.GetByTaskIdAsync(request.TaskId, ct);
        return comments.Select(c => new TaskCommentDto
        {
            CommentId = c.CommentId,
            TaskId = c.TaskId,
            UserId = c.UserId,
            UserName = c.User?.Name,
            UserAvatar = c.User?.Avatar,
            Content = c.Content,
            ImageUrl = c.ImageUrl,
            CreatedAt = c.CreatedAt
        }).ToList();
    }
}
