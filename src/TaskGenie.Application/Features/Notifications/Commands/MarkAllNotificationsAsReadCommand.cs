using MediatR;

namespace TaskGenie.Application.Features.Notifications.Commands;

public record MarkAllNotificationsAsReadCommand(int UserId) : IRequest<Unit>;
