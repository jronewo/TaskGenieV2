using MediatR;

namespace TaskGenie.Application.Features.Skills.Commands;

public record RemoveUserSkillCommand(int UserSkillId) : IRequest<bool>;
