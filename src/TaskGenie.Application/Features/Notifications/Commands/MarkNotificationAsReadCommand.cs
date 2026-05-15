using MediatR;

namespace TaskGenie.Application.Features.Notifications.Commands;

public record MarkNotificationAsReadCommand(int NotificationId) : IRequest<bool>;
