using MediatR;

namespace TaskGenie.Application.Features.Skills.Commands;

/// <summary>Adds a skill to the *current* user's own profile. There is no "on behalf of"
/// variant — the actor is always resolved from the JWT, never a client-supplied UserId.</summary>
public record AddUserSkillCommand(int SkillId, int Level) : IRequest<bool>;
