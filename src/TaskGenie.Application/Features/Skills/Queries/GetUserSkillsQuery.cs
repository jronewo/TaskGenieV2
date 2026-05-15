using MediatR;
using TaskGenie.Application.Features.Skills;

namespace TaskGenie.Application.Features.Skills.Queries;

public record GetUserSkillsQuery(int UserId) : IRequest<List<UserSkillDto>>;
