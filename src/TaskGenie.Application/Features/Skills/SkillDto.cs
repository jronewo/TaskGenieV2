namespace TaskGenie.Application.Features.Skills;

public class SkillDto
{
    public int SkillId { get; set; }
    public string SkillName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}

public class UserSkillDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public int SkillId { get; set; }
    public string? SkillName { get; set; }
    public int? Level { get; set; }
}
