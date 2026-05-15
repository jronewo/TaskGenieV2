using MediatR;

namespace TaskGenie.Application.Features.Skills.Commands;

public record UpdateUserSkillLevelCommand(int UserSkillId, int NewLevel) : IRequest<bool>;
