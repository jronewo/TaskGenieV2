using MediatR;

namespace TaskGenie.Application.Features.Skills.Commands;

public record AddUserSkillCommand(int SkillId, int Level) : IRequest<bool>;
