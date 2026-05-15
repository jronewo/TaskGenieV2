using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Queries;

public sealed record GetTeamByIdQuery(int TeamId) : IRequest<TeamDto?>;

public sealed class GetTeamByIdQueryHandler(
    ITeamRepository teamRepo
) : IRequestHandler<GetTeamByIdQuery, TeamDto?>
{
    public async Task<TeamDto?> Handle(GetTeamByIdQuery query, CancellationToken ct)
    {
        var team = await teamRepo.GetByIdAsync(query.TeamId, ct);
        return team is not null ? TeamDto.FromEntity(team) : null;
    }
}
