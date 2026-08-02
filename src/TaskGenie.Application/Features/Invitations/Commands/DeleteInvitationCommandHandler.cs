using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Commands;

public class DeleteInvitationCommandHandler(
    IResourceAuthorizationService authorization,
    IInvitationRepository invitationRepository)
    : IRequestHandler<DeleteInvitationCommand, bool>
{
    public async Task<bool> Handle(DeleteInvitationCommand request, CancellationToken ct)
    {
        var invitation = await invitationRepository.GetByIdAsync(request.InvitationId, ct)
            ?? throw new NotFoundException(nameof(Invitation), request.InvitationId);

        // Cancelling an invitation is a team-management action.
        if (invitation.TeamId is not int teamId)
            throw new NotFoundException(nameof(Invitation), request.InvitationId);
        await authorization.EnsureCanManageTeamAsync(teamId, ct);

        await invitationRepository.DeleteAsync(request.InvitationId, ct);
        return true;
    }
}
