using MediatR;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Queries;

public class GetInvitationByIdQueryHandler(
    ICurrentUser currentUser,
    IInvitationRepository invitationRepository)
    : IRequestHandler<GetInvitationByIdQuery, InvitationDto?>
{
    public async Task<InvitationDto?> Handle(GetInvitationByIdQuery request, CancellationToken ct)
    {
        var invitation = await invitationRepository.GetByIdAsync(request.InvitationId, ct);
        if (invitation == null) return null;

        // Visible to the addressee (so they can review it before accepting) and to admins.
        // Team managers use the team-scoped listing instead.
        var isAddressee = !string.IsNullOrWhiteSpace(invitation.Email)
            && string.Equals(invitation.Email, currentUser.Email, StringComparison.OrdinalIgnoreCase);

        if (!isAddressee && !currentUser.IsPlatformAdmin) return null;

        return new InvitationDto
        {
            InvitationId = invitation.InvitationId,
            TeamId = invitation.TeamId,
            TeamName = invitation.Team?.Name,
            Email = invitation.Email,
            Status = invitation.Status
        };
    }
}
