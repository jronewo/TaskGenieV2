using MediatR;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record InviteToProjectCommand(
    int ProjectId,
    string Email,
    int InvitedByUserId
) : IRequest<InvitationDto>;

public sealed class InviteToProjectCommandHandler(
    IProjectRepository projectRepo,
    ITeamMemberRepository teamMemberRepo,
    IInvitationRepository invitationRepo
) : IRequestHandler<InviteToProjectCommand, InvitationDto>
{
    public async Task<InvitationDto> Handle(InviteToProjectCommand cmd, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct)
            ?? throw new InvalidOperationException("Project not found.");

        if (project.ProjectType == "Personal")
            throw new InvalidOperationException("Cannot invite members to a personal project.");

        if (project.TeamId is null or 0)
            throw new InvalidOperationException("Project has no team.");

        var members = await teamMemberRepo.GetByTeamIdAsync(project.TeamId.Value, ct);
        var inviter = members.FirstOrDefault(m => m.UserId == cmd.InvitedByUserId);
        if (inviter?.Role != "LEADER")
            throw new UnauthorizedAccessException("Only project leaders can invite members.");

        var invitation = Domain.Entities.Invitation.Create(project.TeamId.Value, cmd.Email);
        await invitationRepo.AddAsync(invitation, ct);

        var created = await invitationRepo.GetByIdAsync(invitation.InvitationId, ct)
            ?? throw new InvalidOperationException("Failed to create invitation.");

        return new InvitationDto
        {
            InvitationId = created.InvitationId,
            TeamId = created.TeamId,
            TeamName = project.Name,
            Email = created.Email,
            Status = created.Status
        };
    }
}
