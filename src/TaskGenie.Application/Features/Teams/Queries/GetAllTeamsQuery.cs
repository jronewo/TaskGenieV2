using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Queries;

public sealed record GetAllTeamsQuery : IRequest<List<TeamDto>>;

public sealed class GetAllTeamsQueryHandler(
    ICurrentUser currentUser,
    ITeamRepository teamRepo
) : IRequestHandler<GetAllTeamsQuery, List<TeamDto>>
{
    public async Task<List<TeamDto>> Handle(GetAllTeamsQuery query, CancellationToken ct)
    {
        var teams = await teamRepo.GetAllAsync(ct);

        // Platform admins see every team; a normal user only sees teams they created or belong to.
        if (!currentUser.IsPlatformAdmin)
        {
            teams = teams
                .Where(t => t.CreatedBy == currentUser.UserId
                    || t.TeamMembers.Any(m => m.UserId == currentUser.UserId))
                .ToList();
        }

        return teams.Select(TeamDto.FromEntity).ToList();
    }
}
