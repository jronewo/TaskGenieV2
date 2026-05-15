using MediatR;
using TaskGenie.Application.Features.TaskComments;

namespace TaskGenie.Application.Features.TaskComments.Queries;

public record GetTaskCommentsQuery(int TaskId) : IRequest<List<TaskCommentDto>>;
