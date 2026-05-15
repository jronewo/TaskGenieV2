using MediatR;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Queries;

public class GetUserInvitationsQueryHandler(IInvitationRepository invitationRepository)
    : IRequestHandler<GetUserInvitationsQuery, List<InvitationDto>>
{
    public async Task<List<InvitationDto>> Handle(GetUserInvitationsQuery request, CancellationToken ct)
    {
        var invitations = await invitationRepository.GetByEmailAsync(request.Email, ct);
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
