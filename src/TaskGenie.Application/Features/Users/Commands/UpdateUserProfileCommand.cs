using MediatR;
using TaskGenie.Application.Features.Users;

namespace TaskGenie.Application.Features.Users.Commands;

public record UpdateUserProfileCommand(int UserId, string? Name, string? Avatar) : IRequest<UserProfileDto>;
