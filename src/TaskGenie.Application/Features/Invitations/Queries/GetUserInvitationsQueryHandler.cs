using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Queries;

public class GetUserInvitationsQueryHandler(
    ICurrentUser currentUser,
    IInvitationRepository invitationRepository)
    : IRequestHandler<GetUserInvitationsQuery, List<InvitationDto>>
{
    public async Task<List<InvitationDto>> Handle(GetUserInvitationsQuery request, CancellationToken ct)
    {
        // Listing invitations by email is an enumeration vector — a caller may only ask about
        // their own address.
        if (!currentUser.IsPlatformAdmin
            && !string.Equals(request.Email, currentUser.Email, StringComparison.OrdinalIgnoreCase))
            throw new ForbiddenException("You may only list invitations addressed to you.");

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
