namespace TaskGenie.Domain.Entities;

public class RiskRule
{
    protected RiskRule() { }

    public int RiskRuleId { get; internal set; }
    public string Code { get; internal set; } = null!;
    public string Name { get; internal set; } = null!;
    public string FactorType { get; internal set; } = null!;
    public double Weight { get; internal set; }
    public string Description { get; internal set; } = null!;
    public string Version { get; internal set; } = null!;
    public bool IsActive { get; internal set; }
    public DateTime CreatedAt { get; internal set; }

    public static RiskRule Create(string code, string name, string factorType, double weight, string description, string version)
    {
        if (weight is < 0 or > 1) throw new ArgumentOutOfRangeException(nameof(weight));

        return new RiskRule
        {
            Code = code.Trim().ToUpperInvariant(),
            Name = name.Trim(),
            FactorType = factorType.Trim().ToUpperInvariant(),
            Weight = weight,
            Description = description.Trim(),
            Version = version.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }
}
