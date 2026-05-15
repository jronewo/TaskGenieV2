namespace TaskGenie.Application.Features.Users;

public class UserProfileDto
{
    public int UserId { get; set; }
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Avatar { get; set; }
    public string? Role { get; set; }
    public DateTime? CreatedAt { get; set; }
}

public class UserSearchDto
{
    public int UserId { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Avatar { get; set; }
}
