using MediatR;
using TaskGenie.Application.Features.Skills;

namespace TaskGenie.Application.Features.Skills.Commands;

public record CreateSkillCommand(string SkillName) : IRequest<SkillDto>;
