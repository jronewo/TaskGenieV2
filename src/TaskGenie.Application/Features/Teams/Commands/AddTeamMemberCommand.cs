using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record AddTeamMemberCommand(
    int TeamId,
    int UserId,
    string Role
) : IRequest<bool>;

public sealed class AddTeamMemberCommandHandler(
    IResourceAuthorizationService authz,
    IUserRepository userRepo,
    ITeamMemberRepository memberRepo
) : IRequestHandler<AddTeamMemberCommand, bool>
{
    public async Task<bool> Handle(AddTeamMemberCommand cmd, CancellationToken ct)
    {
        await authz.EnsureCanManageTeamAsync(cmd.TeamId, ct);

        _ = await userRepo.GetByIdAsync(cmd.UserId, ct)
            ?? throw new NotFoundException("User", cmd.UserId);

        var existing = await memberRepo.GetByTeamIdAsync(cmd.TeamId, ct);
        if (existing.Any(m => m.UserId == cmd.UserId))
            throw new InvalidOperationException("This user is already a member of the team.");

        var member = TeamMember.Create(cmd.TeamId, cmd.UserId, cmd.Role.ToUpperInvariant());
        await memberRepo.AddAsync(member, ct);
        return true;
    }
}
