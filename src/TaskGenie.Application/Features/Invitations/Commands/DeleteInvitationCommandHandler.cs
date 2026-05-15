using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Commands;

public class DeleteInvitationCommandHandler(IInvitationRepository invitationRepository)
    : IRequestHandler<DeleteInvitationCommand, bool>
{
    public async Task<bool> Handle(DeleteInvitationCommand request, CancellationToken ct)
    {
        var invitation = await invitationRepository.GetByIdAsync(request.InvitationId, ct)
            ?? throw new NotFoundException(nameof(Invitation), request.InvitationId);

        await invitationRepository.DeleteAsync(request.InvitationId, ct);
        return true;
    }
}
