using MediatR;
using TaskGenie.Application.Features.Users;

namespace TaskGenie.Application.Features.Users.Queries;

public record GetUserByIdQuery(int UserId) : IRequest<UserProfileDto>;
