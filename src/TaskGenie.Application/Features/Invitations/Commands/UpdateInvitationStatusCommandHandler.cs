using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Commands;

public class UpdateInvitationStatusCommandHandler(
    ICurrentUser currentUser,
    IInvitationRepository invitationRepository,
    IUserRepository userRepository,
    ITeamMemberRepository teamMemberRepository)
    : IRequestHandler<UpdateInvitationStatusCommand, bool>
{
    public async Task<bool> Handle(UpdateInvitationStatusCommand request, CancellationToken ct)
    {
        var invitation = await invitationRepository.GetByIdAsync(request.InvitationId, ct)
            ?? throw new NotFoundException(nameof(Invitation), request.InvitationId);

        // Only the person the invitation was addressed to may accept or reject it. Without this,
        // anyone could POST an arbitrary invitation ID and join a team they were never invited to.
        // Hide existence from everyone else rather than returning 403.
        var isAddressee = !string.IsNullOrWhiteSpace(invitation.Email)
            && string.Equals(invitation.Email, currentUser.Email, StringComparison.OrdinalIgnoreCase);

        if (!isAddressee && !currentUser.IsPlatformAdmin)
            throw new NotFoundException(nameof(Invitation), request.InvitationId);

        // Normalise before comparing. The membership branch below used to test `== "Accepted"`
        // exactly, so a client sending "ACCEPTED" flipped the status without ever joining the team —
        // a silently inconsistent invitation. An unknown status is rejected outright rather than
        // being written to the row.
        var status = Normalise(request.Status);

        invitation.UpdateStatus(status);
        await invitationRepository.UpdateAsync(invitation, ct);

        if (status == "Accepted" && !string.IsNullOrWhiteSpace(invitation.Email) && invitation.TeamId.HasValue)
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

    /// <summary>Maps any casing of the three legal outcomes onto the stored form.</summary>
    private static string Normalise(string? status) => status?.Trim().ToUpperInvariant() switch
    {
        "ACCEPTED" => "Accepted",
        "REJECTED" or "DECLINED" => "Rejected",
        "PENDING" => "Pending",
        _ => throw new InvalidOperationException("Status must be Accepted, Rejected or Pending."),
    };
}
