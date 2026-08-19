using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record CreateTeamCommand(
    string Name,
    string? Description
) : IRequest<TeamDto>;

public sealed class CreateTeamCommandHandler(
    ICurrentUser currentUser,
    ITeamLifecycleService lifecycle,
    ITeamRepository teamRepo
) : IRequestHandler<CreateTeamCommand, TeamDto>
{
    public async Task<TeamDto> Handle(CreateTeamCommand cmd, CancellationToken ct)
    {
        // Team + creator's initial LEADER membership are created atomically.
        var team = await lifecycle.CreateTeamAsync(cmd.Name, cmd.Description, currentUser.UserId, ct);

        var created = await teamRepo.GetByIdAsync(team.TeamId, ct);
        return TeamDto.FromEntity(created!);
    }
}
