using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Commands;

public class UpdateInvitationStatusCommandHandler(
    IInvitationRepository invitationRepository,
    IUserRepository userRepository,
    ITeamMemberRepository teamMemberRepository)
    : IRequestHandler<UpdateInvitationStatusCommand, bool>
{
    public async Task<bool> Handle(UpdateInvitationStatusCommand request, CancellationToken ct)
    {
        var invitation = await invitationRepository.GetByIdAsync(request.InvitationId, ct)
            ?? throw new NotFoundException(nameof(Invitation), request.InvitationId);

        invitation.UpdateStatus(request.Status);
        await invitationRepository.UpdateAsync(invitation, ct);

        if (request.Status == "Accepted" && !string.IsNullOrWhiteSpace(invitation.Email) && invitation.TeamId.HasValue)
        {
            var user = await userRepository.GetByEmailAsync(invitation.Email, ct);
            if (user != null)
            {
                var existing = await teamMemberRepository.GetByTeamIdAsync(invitation.TeamId.Value, ct);
                if (!existing.Any(m => m.UserId == user.UserId))
                {
                    var member = TeamMember.Create(invitation.TeamId.Value, user.UserId);
                    await teamMemberRepository.AddAsync(member, ct);
                }
            }
        }

        return true;
    }
}
