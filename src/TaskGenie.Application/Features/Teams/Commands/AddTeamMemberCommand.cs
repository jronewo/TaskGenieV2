using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record AddTeamMemberCommand(
    int TeamId,
    int UserId,
    string Role
) : IRequest<bool>;

public sealed class AddTeamMemberCommandHandler(
    ITeamMemberRepository memberRepo
) : IRequestHandler<AddTeamMemberCommand, bool>
{
    public async Task<bool> Handle(AddTeamMemberCommand cmd, CancellationToken ct)
    {
        // Check if already a member
        var existing = await memberRepo.GetByTeamIdAsync(cmd.TeamId, ct);
        if (existing.Any(m => m.UserId == cmd.UserId)) return false;

        var member = TeamMember.Create(cmd.TeamId, cmd.UserId, cmd.Role);
        await memberRepo.AddAsync(member, ct);
        return true;
    }
}
