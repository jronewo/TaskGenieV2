using MediatR;

namespace TaskGenie.Application.Features.Notifications.Queries;

public record GetUnreadCountQuery(int UserId) : IRequest<int>;
