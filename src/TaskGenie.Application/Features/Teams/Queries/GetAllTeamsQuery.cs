using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Queries;

public sealed record GetAllTeamsQuery : IRequest<List<TeamDto>>;

public sealed class GetAllTeamsQueryHandler(
    ITeamRepository teamRepo
) : IRequestHandler<GetAllTeamsQuery, List<TeamDto>>
{
    public async Task<List<TeamDto>> Handle(GetAllTeamsQuery query, CancellationToken ct)
    {
        var teams = await teamRepo.GetAllAsync(ct);
        return teams.Select(TeamDto.FromEntity).ToList();
    }
}
