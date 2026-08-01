using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record DeleteTeamCommand(int TeamId) : IRequest<bool>;

public sealed class DeleteTeamCommandHandler(
    IResourceAuthorizationService authz,
    ITeamLifecycleService lifecycle
) : IRequestHandler<DeleteTeamCommand, bool>
{
    public async Task<bool> Handle(DeleteTeamCommand cmd, CancellationToken ct)
    {
        var team = await authz.EnsureCanManageTeamAsync(cmd.TeamId, ct);
        await lifecycle.DeleteTeamAsync(team, ct);
        return true;
    }
}
