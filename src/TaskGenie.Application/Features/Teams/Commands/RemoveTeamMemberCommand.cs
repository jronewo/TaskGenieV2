using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record RemoveTeamMemberCommand(int MemberId) : IRequest<bool>;

public sealed class RemoveTeamMemberCommandHandler(
    IResourceAuthorizationService authz,
    ITeamMemberRepository memberRepo
) : IRequestHandler<RemoveTeamMemberCommand, bool>
{
    public async Task<bool> Handle(RemoveTeamMemberCommand cmd, CancellationToken ct)
    {
        var member = await memberRepo.GetByIdAsync(cmd.MemberId, ct)
            ?? throw new NotFoundException("TeamMember", cmd.MemberId);

        if (member.TeamId is not int teamId)
            throw new NotFoundException("TeamMember", cmd.MemberId);

        await authz.EnsureCanManageTeamAsync(teamId, ct);

        if (member.Role == "LEADER")
        {
            var teamMembers = await memberRepo.GetByTeamIdAsync(teamId, ct);
            if (teamMembers.Count(m => m.Role == "LEADER") <= 1)
                throw new InvalidOperationException(
                    "Cannot remove the last leader of a team. Assign another leader first.");
        }

        await memberRepo.DeleteAsync(cmd.MemberId, ct);
        return true;
    }
}
