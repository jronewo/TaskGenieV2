using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record RemoveTeamMemberCommand(int MemberId) : IRequest<bool>;

public sealed class RemoveTeamMemberCommandHandler(
    ITeamMemberRepository memberRepo
) : IRequestHandler<RemoveTeamMemberCommand, bool>
{
    public async Task<bool> Handle(RemoveTeamMemberCommand cmd, CancellationToken ct)
    {
        await memberRepo.DeleteAsync(cmd.MemberId, ct);
        return true;
    }
}
