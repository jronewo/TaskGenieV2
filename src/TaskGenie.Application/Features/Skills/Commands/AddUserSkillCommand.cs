using MediatR;

namespace TaskGenie.Application.Features.Skills.Commands;

public record AddUserSkillCommand(int UserId, int SkillId, int Level) : IRequest<bool>;
