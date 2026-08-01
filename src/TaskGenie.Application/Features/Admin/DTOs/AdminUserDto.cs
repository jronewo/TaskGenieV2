using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Admin.DTOs;

/// <summary>Admin-facing user projection. Never includes Password or any token/claim data.</summary>
public sealed class AdminUserDto
{
    public int UserId { get; init; }
    public string Name { get; init; } = null!;
    public string Email { get; init; } = null!;
    public string? Avatar { get; init; }
    public string Role { get; init; } = null!;
    public int Status { get; init; }
    public bool IsActive => Status == UserStatus.Active && DeletedAt is null;
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public DateTime? DeletedAt { get; init; }

    public static AdminUserDto FromEntity(User u) => new()
    {
        UserId = u.UserId,
        Name = u.Name,
        Email = u.Email,
        Avatar = u.Avatar,
        Role = u.Role ?? "NORMAL_USER",
        Status = u.Status ?? UserStatus.Active,
        CreatedAt = u.CreatedAt,
        UpdatedAt = u.UpdatedAt,
        DeletedAt = u.DeletedAt
    };
}
