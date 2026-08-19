using MediatR;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Application.Features.Notifications.Commands;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Commands;

public class CreateInvitationCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IInvitationRepository invitationRepository,
    IUserRepository userRepository,
    IEmailSender emailSender,
    IOptions<AppUrlSettings> appUrls,
    IMediator mediator,
    ILogger<CreateInvitationCommandHandler> logger)
    : IRequestHandler<CreateInvitationCommand, InvitationDto>
{
    public async Task<InvitationDto> Handle(CreateInvitationCommand request, CancellationToken ct)
    {
        // Only someone who can manage the team may invite people into it.
        var team = await authorization.EnsureCanManageTeamAsync(request.TeamId, ct);

        var invitation = Invitation.Create(request.TeamId, request.Email);
        await invitationRepository.AddAsync(invitation, ct);

        var created = await invitationRepository.GetByIdAsync(invitation.InvitationId, ct)
            ?? throw new NotFoundException(nameof(Invitation), invitation.InvitationId);

        await AnnounceAsync(created, team.Name, ct);

        return new InvitationDto
        {
            InvitationId = created.InvitationId,
            TeamId = created.TeamId,
            TeamName = created.Team?.Name,
            Email = created.Email,
            Status = created.Status
        };
    }

    /// <summary>
    /// Two channels, neither of which may break the invitation itself: an in-app notification when
    /// the invited address already has an account, and an email that deep-links to the notification
    /// centre. The email carries no decision token — accepting happens in-app while signed in, so a
    /// forwarded message cannot accept on someone else's behalf.
    /// </summary>
    private async System.Threading.Tasks.Task AnnounceAsync(Invitation invitation, string? teamName, CancellationToken ct)
    {
        var team = teamName ?? invitation.Team?.Name ?? $"Team #{invitation.TeamId}";
        var inviter = await SafeInviterNameAsync(ct);
        var respondUrl = appUrls.Value.BuildNotificationsUrl();

        try
        {
            var existing = await userRepository.GetByEmailAsync(invitation.Email, ct);
            if (existing is not null)
            {
                await mediator.Send(
                    new CreateNotificationCommand(
                        existing.UserId,
                        "INVITATION",
                        $"Lời mời tham gia {team}",
                        $"{inviter} mời bạn tham gia {team}. Chấp nhận hoặc từ chối tại đây.",
                        invitation.InvitationId,
                        "INVITATION"),
                    ct);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not notify {Email} in-app about invitation {InvitationId}.",
                invitation.Email, invitation.InvitationId);
        }

        try
        {
            await emailSender.SendTeamInvitationEmailAsync(invitation.Email, team, inviter, respondUrl, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not email invitation {InvitationId} to {Email}.",
                invitation.InvitationId, invitation.Email);
        }
    }

    private async Task<string> SafeInviterNameAsync(CancellationToken ct)
    {
        try
        {
            var inviter = await userRepository.GetByIdAsync(currentUser.UserId, ct);
            return string.IsNullOrWhiteSpace(inviter?.Name) ? "Một quản trị viên" : inviter!.Name;
        }
        catch
        {
            return "Một quản trị viên";
        }
    }
}
