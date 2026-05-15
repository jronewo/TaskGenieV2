using MediatR;
using TaskGenie.Application.Features.Notifications;

namespace TaskGenie.Application.Features.Notifications.Queries;

public record GetUserNotificationsQuery(int UserId, int Limit = 50) : IRequest<List<NotificationDto>>;
