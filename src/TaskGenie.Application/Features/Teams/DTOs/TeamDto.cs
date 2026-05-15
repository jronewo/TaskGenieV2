using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Teams.DTOs;

public sealed class TeamDto
{
    public int TeamId { get; init; }
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public int? CreatedBy { get; init; }
    public string? CreatorName { get; init; }
    public List<TeamMemberDto> Members { get; init; } = new();

    public static TeamDto FromEntity(Team t) => new()
    {
        TeamId = t.TeamId,
        Name = t.Name ?? "Untitled Team",
        Description = t.Description,
        CreatedBy = t.CreatedBy,
        CreatorName = t.CreatedByNavigation?.Name,
        Members = t.TeamMembers.Select(tm => new TeamMemberDto
        {
            Id = tm.Id,
            TeamId = tm.TeamId ?? 0,
            UserId = tm.UserId ?? 0,
            UserName = tm.User?.Name,
            UserEmail = tm.User?.Email,
            Role = tm.Role
        }).ToList()
    };
}

public sealed class TeamMemberDto
{
    public int Id { get; init; }
    public int TeamId { get; init; }
    public int UserId { get; init; }
    public string? UserName { get; init; }
    public string? UserEmail { get; init; }
    public string? Role { get; init; }
}
