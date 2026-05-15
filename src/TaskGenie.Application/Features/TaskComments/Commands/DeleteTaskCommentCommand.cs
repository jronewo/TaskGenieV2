using MediatR;

namespace TaskGenie.Application.Features.TaskComments.Commands;

public record DeleteTaskCommentCommand(int CommentId) : IRequest<bool>;
