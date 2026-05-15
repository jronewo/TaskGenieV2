using MediatR;
using TaskGenie.Application.Features.TaskComments;

namespace TaskGenie.Application.Features.TaskComments.Commands;

public record CreateTaskCommentCommand(
    int TaskId,
    int UserId,
    string? Content,
    string? ImageUrl) : IRequest<TaskCommentDto>;
