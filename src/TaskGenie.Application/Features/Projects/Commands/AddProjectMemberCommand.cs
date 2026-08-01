using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record AddProjectMemberCommand(
    int ProjectId,
    string Email,
    string Role,
    int AddedByUserId
) : IRequest<bool>;

public sealed class AddProjectMemberCommandHandler(
    IProjectRepository projectRepo,
    IUserRepository userRepo,
    ITeamMemberRepository teamMemberRepo
) : IRequestHandler<AddProjectMemberCommand, bool>
{
    public async Task<bool> Handle(AddProjectMemberCommand cmd, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct)
            ?? throw new NotFoundException(nameof(Project), cmd.ProjectId);

        if (project.ProjectType == "Personal")
            throw new InvalidOperationException("Cannot add members to a personal project.");

        if (project.TeamId is null or 0)
            throw new InvalidOperationException("Project has no team.");

        var members = await teamMemberRepo.GetByTeamIdAsync(project.TeamId.Value, ct);
        var actor = members.FirstOrDefault(m => m.UserId == cmd.AddedByUserId);
        if (actor?.Role != "LEADER")
            throw new UnauthorizedAccessException("Only project leaders can add members.");

        var user = await userRepo.GetByEmailAsync(cmd.Email, ct)
            ?? throw new NotFoundException("User with email", cmd.Email);

        if (members.Any(m => m.UserId == user.UserId))
            return true;

        var member = TeamMember.Create(
            project.TeamId.Value,
            user.UserId,
            cmd.Role ?? "MEMBER");
        await teamMemberRepo.AddAsync(member, ct);
        return true;
    }
}
