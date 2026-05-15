using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Queries;

/// <summary>
/// Returns all teams that the given user is a creator of or a member in.
/// </summary>
public sealed record GetMyTeamsQuery(int UserId) : IRequest<List<TeamDto>>;

public sealed class GetMyTeamsQueryHandler(
    ITeamRepository teamRepo
) : IRequestHandler<GetMyTeamsQuery, List<TeamDto>>
{
    public async Task<List<TeamDto>> Handle(GetMyTeamsQuery query, CancellationToken ct)
    {
        var allTeams = await teamRepo.GetAllAsync(ct);
        var myTeams = allTeams
            .Where(t =>
                t.CreatedBy == query.UserId ||
                t.TeamMembers.Any(m => m.UserId == query.UserId))
            .ToList();
        return myTeams.Select(TeamDto.FromEntity).ToList();
    }
}
