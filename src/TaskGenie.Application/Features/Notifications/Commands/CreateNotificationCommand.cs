using MediatR;

namespace TaskGenie.Application.Features.Notifications.Commands;

public record CreateNotificationCommand(
    int UserId,
    string Type,
    string Title,
    string? Message,
    int? ReferenceId,
    string? ReferenceType) : IRequest<Unit>;
