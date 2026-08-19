using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Application.Common.Services;

public sealed class ResourceAuthorizationService(
    ICurrentUser currentUser,
    IProjectRepository projectRepo,
    ITeamRepository teamRepo,
    ITeamMemberRepository teamMemberRepo,
    IOrganizationRepository organizationRepo,
    IOrganizationMemberRepository organizationMemberRepo,
    ITaskRepository taskRepo,
    IUserSkillRepository userSkillRepo
) : IResourceAuthorizationService
{
    public async Task<Project> EnsureCanAccessProjectAsync(int projectId, CancellationToken ct = default)
    {
        var project = await projectRepo.GetByIdAsync(projectId, ct)
            ?? throw new NotFoundException("Project", projectId);

        if (await CanAccessProjectAsync(project, ct)) return project;
        throw new ForbiddenException("You do not have access to this project.");
    }

    public async Task<Project> EnsureCanManageProjectAsync(int projectId, CancellationToken ct = default)
    {
        var project = await projectRepo.GetByIdAsync(projectId, ct)
            ?? throw new NotFoundException("Project", projectId);

        if (await CanManageProjectAsync(project, ct)) return project;
        throw new ForbiddenException("You do not have permission to manage this project.");
    }

    public async Task<Team> EnsureCanAccessTeamAsync(int teamId, CancellationToken ct = default)
    {
        var team = await teamRepo.GetByIdAsync(teamId, ct)
            ?? throw new NotFoundException("Team", teamId);

        if (currentUser.IsPlatformAdmin) return team;
        if (team.CreatedBy == currentUser.UserId) return team;
        if (await IsTeamMemberAsync(teamId, ct)) return team;
        throw new ForbiddenException("You do not have access to this team.");
    }

    public async Task<Team> EnsureCanManageTeamAsync(int teamId, CancellationToken ct = default)
    {
        var team = await teamRepo.GetByIdAsync(teamId, ct)
            ?? throw new NotFoundException("Team", teamId);

        if (currentUser.IsPlatformAdmin) return team;
        if (team.CreatedBy == currentUser.UserId) return team;
        throw new ForbiddenException("You do not have permission to manage this team.");
    }

    public async Task<TaskEntity> EnsureCanAccessTaskAsync(int taskId, CancellationToken ct = default)
    {
        var task = await taskRepo.GetByIdAsync(taskId, ct)
            ?? throw new NotFoundException("Task", taskId);

        var project = await GetTaskProjectOrThrowAsync(task, ct);
        if (await CanAccessProjectAsync(project, ct)) return task;
        throw new ForbiddenException("You do not have access to this task.");
    }

    public async Task<TaskEntity> EnsureCanManageTaskAsync(int taskId, CancellationToken ct = default)
    {
        var task = await taskRepo.GetByIdAsync(taskId, ct)
            ?? throw new NotFoundException("Task", taskId);

        var project = await GetTaskProjectOrThrowAsync(task, ct);
        if (await CanManageProjectTasksAsync(project, ct)) return task;
        throw new ForbiddenException("You do not have permission to manage this task.");
    }

    public async Task<TaskEntity> EnsureCanUpdateTaskStatusAsync(int taskId, CancellationToken ct = default)
    {
        var task = await taskRepo.GetByIdAsync(taskId, ct)
            ?? throw new NotFoundException("Task", taskId);

        var project = await GetTaskProjectOrThrowAsync(task, ct);
        if (await CanAccessProjectAsync(project, ct)) return task;
        throw new ForbiddenException("You do not have access to this task.");
    }

    public async Task<Project> EnsureCanManageTasksInProjectAsync(int projectId, CancellationToken ct = default)
    {
        var project = await projectRepo.GetByIdAsync(projectId, ct)
            ?? throw new NotFoundException("Project", projectId);

        if (await CanManageProjectTasksAsync(project, ct)) return project;
        throw new ForbiddenException("You do not have permission to manage tasks in this project.");
    }

    public async Task<bool> CanManageTasksInProjectAsync(int projectId, CancellationToken ct = default)
    {
        var project = await projectRepo.GetByIdAsync(projectId, ct);
        return project is not null && await CanManageProjectTasksAsync(project, ct);
    }

    private async Task<bool> CanManageProjectTasksAsync(Project project, CancellationToken ct)
    {
        if (currentUser.IsPlatformAdmin) return true;
        if (project.CreatedBy == currentUser.UserId) return true;
        if (project.OrganizationId is int orgId && await IsOrganizationOwnerAsync(orgId, ct)) return true;
        if (project.TeamId is int teamId && await IsTeamLeaderAsync(teamId, ct)) return true;
        return false;
    }

    public async Task<Organization> EnsureCanAccessOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        var organization = await organizationRepo.GetByIdAsync(organizationId, ct)
            ?? throw new NotFoundException("Organization", organizationId);

        if (currentUser.IsPlatformAdmin) return organization;
        if (organization.OwnerId == currentUser.UserId) return organization;

        var membership = await organizationMemberRepo
            .GetByOrganizationAndUserAsync(organizationId, currentUser.UserId, ct);
        if (membership is { IsActive: true }) return organization;

        throw new ForbiddenException("You do not have access to this organization.");
    }

    public async Task<Organization> EnsureCanManageOrganizationAsync(int organizationId, CancellationToken ct = default)
    {
        var organization = await organizationRepo.GetByIdAsync(organizationId, ct)
            ?? throw new NotFoundException("Organization", organizationId);

        if (currentUser.IsPlatformAdmin) return organization;
        if (organization.OwnerId == currentUser.UserId) return organization;

        var membership = await organizationMemberRepo
            .GetByOrganizationAndUserAsync(organizationId, currentUser.UserId, ct);
        if (membership is { CanManageMembers: true }) return organization;

        throw new ForbiddenException("You do not have permission to manage this organization.");
    }

    public void EnsureSelfOrPlatformAdmin(int userId)
    {
        if (currentUser.IsPlatformAdmin) return;
        if (userId == currentUser.UserId) return;
        throw new ForbiddenException("You may only access your own data.");
    }

    public async System.Threading.Tasks.Task EnsureCanViewUserPerformanceAsync(int subjectUserId, CancellationToken ct = default)
    {
        if (currentUser.IsPlatformAdmin) return;
        if (subjectUserId == currentUser.UserId) return;

        // A leader of any team the subject belongs to may review their history.
        var subjectTeams = await teamMemberRepo.GetByUserIdAsync(subjectUserId, ct);
        foreach (var membership in subjectTeams)
        {
            if (membership.TeamId is not int teamId) continue;
            if (await IsTeamLeaderAsync(teamId, ct)) return;
        }

        throw new ForbiddenException("You may only view performance history for people you lead.");
    }

    public async Task<UserSkill> EnsureCanManageUserSkillAsync(int userSkillId, CancellationToken ct = default)
    {
        var userSkill = await userSkillRepo.GetByIdAsync(userSkillId, ct)
            ?? throw new NotFoundException("UserSkill", userSkillId);

        if (currentUser.IsPlatformAdmin) return userSkill;
        if (userSkill.UserId == currentUser.UserId) return userSkill;
        throw new ForbiddenException("You do not have permission to manage this user's skill.");
    }

    private async Task<Project> GetTaskProjectOrThrowAsync(TaskEntity task, CancellationToken ct)
    {
        if (task.ProjectId is not int projectId)
            throw new ForbiddenException("This task is not associated with a project.");

        return await projectRepo.GetByIdAsync(projectId, ct)
            ?? throw new NotFoundException("Project", projectId);
    }

    private async Task<bool> CanAccessProjectAsync(Project project, CancellationToken ct)
    {
        if (currentUser.IsPlatformAdmin) return true;
        if (project.CreatedBy == currentUser.UserId) return true;
        if (project.OrganizationId is int orgId && await IsOrganizationOwnerAsync(orgId, ct)) return true;
        if (project.TeamId is int teamId && await IsTeamMemberAsync(teamId, ct)) return true;
        return false;
    }

    private async Task<bool> CanManageProjectAsync(Project project, CancellationToken ct)
    {
        if (currentUser.IsPlatformAdmin) return true;
        if (project.CreatedBy == currentUser.UserId) return true;
        if (project.OrganizationId is int orgId && await IsOrganizationOwnerAsync(orgId, ct)) return true;
        return false;
    }

    /// <summary>Owner, or an ACTIVE OWNER/ORG_ADMIN member — the people allowed to act on the
    /// organization's projects.</summary>
    private async Task<bool> IsOrganizationOwnerAsync(int organizationId, CancellationToken ct)
    {
        var org = await organizationRepo.GetByIdAsync(organizationId, ct);
        if (org?.OwnerId == currentUser.UserId) return true;

        var membership = await organizationMemberRepo
            .GetByOrganizationAndUserAsync(organizationId, currentUser.UserId, ct);
        return membership is { CanManageMembers: true };
    }

    private async Task<bool> IsTeamMemberAsync(int teamId, CancellationToken ct)
    {
        var members = await teamMemberRepo.GetByTeamIdAsync(teamId, ct);
        return members.Any(m => m.UserId == currentUser.UserId);
    }

    private async Task<bool> IsTeamLeaderAsync(int teamId, CancellationToken ct)
    {
        var members = await teamMemberRepo.GetByTeamIdAsync(teamId, ct);
        return members.Any(m => m.UserId == currentUser.UserId && m.Role == "LEADER");
    }
}
