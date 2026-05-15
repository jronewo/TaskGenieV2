using MediatR;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Queries;

public class GetTeamInvitationsQueryHandler(IInvitationRepository invitationRepository)
    : IRequestHandler<GetTeamInvitationsQuery, List<InvitationDto>>
{
    public async Task<List<InvitationDto>> Handle(GetTeamInvitationsQuery request, CancellationToken ct)
    {
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
