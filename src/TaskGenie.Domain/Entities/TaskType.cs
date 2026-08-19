namespace TaskGenie.Domain.Entities;

/// <summary>
/// What kind of work a task is — Develop, Bug, Testing, Migration and so on.
///
/// The board previously guessed this from a regex over the title ("fix", "bug", "crash"), which
/// meant "Fix the copy on the pricing page" was filed as a defect and anything in Vietnamese was
/// always a plain Task. A real lookup table lets a leader classify work and keeps the board's
/// filters honest.
/// </summary>
public class TaskType
{
    protected TaskType() { }

    public int TaskTypeId { get; internal set; }

    /// <summary>Stable machine name (DEVELOP, BUG…). Display names may be renamed; this may not.</summary>
    public string Code { get; internal set; } = null!;

    public string Name { get; internal set; } = null!;

    /// <summary>Hex colour used for the board chip, so a type reads at a glance.</summary>
    public string? ColorHex { get; internal set; }

    /// <summary>Types are archived, never deleted — existing tasks keep referencing them.</summary>
    public bool IsActive { get; internal set; } = true;

    public virtual ICollection<Task> Tasks { get; internal set; } = new List<Task>();

    public static TaskType Create(string code, string name, string? colorHex = null) => new()
    {
        Code = code.Trim().ToUpperInvariant(),
        Name = name.Trim(),
        ColorHex = colorHex,
        IsActive = true
    };

    public void Rename(string name) => Name = name.Trim();

    public void SetColor(string? colorHex) => ColorHex = colorHex;

    public void SetActive(bool isActive) => IsActive = isActive;
}
