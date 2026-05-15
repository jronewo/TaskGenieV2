using MediatR;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Queries;

public class GetInvitationByIdQueryHandler(IInvitationRepository invitationRepository)
    : IRequestHandler<GetInvitationByIdQuery, InvitationDto?>
{
    public async Task<InvitationDto?> Handle(GetInvitationByIdQuery request, CancellationToken ct)
    {
        var invitation = await invitationRepository.GetByIdAsync(request.InvitationId, ct);
        if (invitation == null) return null;
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
