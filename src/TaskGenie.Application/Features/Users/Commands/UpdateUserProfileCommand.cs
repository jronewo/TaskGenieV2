using MediatR;
using TaskGenie.Application.Features.Users;

namespace TaskGenie.Application.Features.Users.Commands;

/// <summary>Always applies to the authenticated user — the actor is never taken from the client.</summary>
public record UpdateUserProfileCommand(string? Name, string? Avatar) : IRequest<UserProfileDto>;
