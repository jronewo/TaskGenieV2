using MediatR;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Queries;

public class GetTeamInvitationsQueryHandler(
    IResourceAuthorizationService authorization,
    IInvitationRepository invitationRepository)
    : IRequestHandler<GetTeamInvitationsQuery, List<InvitationDto>>
{
    public async Task<List<InvitationDto>> Handle(GetTeamInvitationsQuery request, CancellationToken ct)
    {
        // The pending-invite list exposes the email addresses of people invited to the team.
        await authorization.EnsureCanManageTeamAsync(request.TeamId, ct);

        var invitations = await invitationRepository.GetByTeamIdAsync(request.TeamId, ct);
        return invitations.Select(i => new InvitationDto
        {
            InvitationId = i.InvitationId,
            TeamId = i.TeamId,
            TeamName = i.Team?.Name,
            Email = i.Email,
            Status = i.Status
        }).ToList();
    }
}
