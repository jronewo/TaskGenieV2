using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Teams.Queries;

public sealed record GetTeamByIdQuery(int TeamId) : IRequest<TeamDto?>;

public sealed class GetTeamByIdQueryHandler(
    IResourceAuthorizationService authz
) : IRequestHandler<GetTeamByIdQuery, TeamDto?>
{
    public async Task<TeamDto?> Handle(GetTeamByIdQuery query, CancellationToken ct)
    {
        var team = await authz.EnsureCanAccessTeamAsync(query.TeamId, ct);
        return TeamDto.FromEntity(team);
    }
}
