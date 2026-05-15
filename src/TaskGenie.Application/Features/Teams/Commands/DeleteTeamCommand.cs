using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Teams.Commands;

public sealed record DeleteTeamCommand(int TeamId) : IRequest<bool>;

public sealed class DeleteTeamCommandHandler(
    ITeamRepository teamRepo
) : IRequestHandler<DeleteTeamCommand, bool>
{
    public async Task<bool> Handle(DeleteTeamCommand cmd, CancellationToken ct)
    {
        await teamRepo.DeleteAsync(cmd.TeamId, ct);
        return true;
    }
}
