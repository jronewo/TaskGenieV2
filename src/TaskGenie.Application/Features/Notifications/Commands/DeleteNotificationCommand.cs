using MediatR;

namespace TaskGenie.Application.Features.Notifications.Commands;

public record DeleteNotificationCommand(int NotificationId) : IRequest<bool>;
