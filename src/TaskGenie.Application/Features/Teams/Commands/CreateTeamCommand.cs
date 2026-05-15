using MediatR;
using TaskGenie.Application.Features.Teams.DTOs;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record CreateTeamCommand(
    string Name,
    string? Description,
    int CreatedBy
) : IRequest<TeamDto>;

public sealed class CreateTeamCommandHandler(
    ITeamRepository teamRepo,
    ITeamMemberRepository memberRepo
) : IRequestHandler<CreateTeamCommand, TeamDto>
{
    public async Task<TeamDto> Handle(CreateTeamCommand cmd, CancellationToken ct)
    {
        var team = Team.Create(cmd.Name, cmd.Description, cmd.CreatedBy);
        await teamRepo.AddAsync(team, ct);

        // Add creator as LEADER
        var leader = TeamMember.Create(team.TeamId, cmd.CreatedBy, "LEADER");
        await memberRepo.AddAsync(leader, ct);

        var created = await teamRepo.GetByIdAsync(team.TeamId, ct);
        return TeamDto.FromEntity(created!);
    }
}
