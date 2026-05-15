using MediatR;
using TaskGenie.Application.Features.Skills;

namespace TaskGenie.Application.Features.Skills.Queries;

public record GetSkillByIdQuery(int SkillId) : IRequest<SkillDto?>;
