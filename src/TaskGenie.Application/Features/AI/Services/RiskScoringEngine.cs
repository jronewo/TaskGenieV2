namespace TaskGenie.Application.Features.AI.Services;

public static class RiskFactorCodes
{
    public const string Deadline = "DEADLINE";
    public const string Progress = "PROGRESS";
    public const string Dependency = "DEPENDENCY";
    public const string Workload = "WORKLOAD";
    public const string Historical = "HISTORICAL";
}

public sealed record RiskScoringInput(
    DateOnly Today,
    string? Status,
    int Progress,
    DateOnly? Deadline,
    DateTime? CreatedAt,
    int EstimatedHours,
    int ActualHours,
    int TotalDependencies,
    int IncompleteDependencies,
    string? ReportedRisk,
    DateTime? LatestProgressAt,
    double AverageActiveTaskCount,
    double AverageAvailableHours,
    double? AverageDeadlineScore,
    /// <summary>1–5 as stored on the task; null when nobody (and no AI pass) has estimated it.</summary>
    int? Difficulty = null,
    /// <summary>Low/Medium/High/Critical — stands in for difficulty when nobody has estimated one.</summary>
    string? Priority = null,
    /// <summary>The project's configured working day; null falls back to the platform default.</summary>
    int? WorkingHoursPerDay = null);

public sealed record RiskRuleDefinition(int? RuleId, string Code, double Weight, string Version);

public sealed record CalculatedRiskFactor(
    int? RuleId,
    string Code,
    string RawValue,
    double Score,
    double Weight,
    double Contribution,
    string Evidence);

public sealed record RiskScoringResult(
    double TotalScore,
    string RiskLevel,
    string RuleVersion,
    IReadOnlyList<CalculatedRiskFactor> Factors,
    string Explanation,
    IReadOnlyList<string> MitigationActions);

/// <summary>
/// Deterministic and explainable risk engine. An external language model may improve
/// the wording, but it never changes the score produced here.
/// </summary>
public sealed class RiskScoringEngine
{
    public const string DefaultVersion = "risk-v1";

    public static readonly IReadOnlyList<RiskRuleDefinition> DefaultRules =
    [
        // Deadline leads: a date that has nearly arrived is the signal people actually act on, and
        // spreading it thin across five factors kept "due tomorrow" reading as MEDIUM.
        new(null, RiskFactorCodes.Deadline, 0.40, DefaultVersion),
        new(null, RiskFactorCodes.Progress, 0.25, DefaultVersion),
        new(null, RiskFactorCodes.Dependency, 0.20, DefaultVersion),
        new(null, RiskFactorCodes.Workload, 0.10, DefaultVersion),
        new(null, RiskFactorCodes.Historical, 0.05, DefaultVersion)
    ];

    public RiskScoringResult Calculate(RiskScoringInput input, IReadOnlyCollection<RiskRuleDefinition>? configuredRules = null)
    {
        var rules = NormalizeRules(configuredRules);
        var scores = IsDone(input)
            ? DefaultRules.ToDictionary(
                rule => rule.Code,
                _ => (Score: 0d, Raw: "completed", Evidence: "Completed tasks have no active risk exposure."))
            : new Dictionary<string, (double Score, string Raw, string Evidence)>
            {
                [RiskFactorCodes.Deadline] = CalculateDeadline(input),
                [RiskFactorCodes.Progress] = CalculateProgress(input),
                [RiskFactorCodes.Dependency] = CalculateDependency(input),
                [RiskFactorCodes.Workload] = CalculateWorkload(input),
                [RiskFactorCodes.Historical] = CalculateHistorical(input)
            };

        var factors = rules.Select(rule =>
        {
            var value = scores[rule.Code];
            var score = Math.Round(Math.Clamp(value.Score, 0, 100), 2);
            var contribution = Math.Round(score * rule.Weight, 2);
            return new CalculatedRiskFactor(rule.RuleId, rule.Code, value.Raw, score, rule.Weight, contribution, value.Evidence);
        }).ToList();

        var total = Math.Round(Math.Clamp(factors.Sum(f => f.Contribution), 0, 100), 2);
        var level = Escalate(GetRiskLevel(total), input);
        var highest = factors.OrderByDescending(f => f.Contribution).Take(3).ToList();
        var explanation = $"Risk {level} ({total:F2}/100). Main contributors: " +
                          string.Join(", ", highest.Select(f => $"{f.Code} {f.Score:F0}")) + ".";

        // A level that was raised by a floor must say so, or the score and the badge look inconsistent.
        if (level != GetRiskLevel(total))
        {
            var daysLeft = input.Deadline!.Value.DayNumber - input.Today.DayNumber;
            var why = input.Difficulty is int d && d >= HardDifficulty
                ? $"difficulty {d}/5"
                : $"{input.Priority} priority";
            explanation += daysLeft < 0
                ? $" Raised to {level}: overdue by {-daysLeft} day(s) and not finished."
                : $" Raised to {level}: due in {daysLeft} day(s) with {why}.";
        }

        var mitigations = BuildMitigations(factors);
        var version = rules.Select(r => r.Version).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? DefaultVersion;

        return new RiskScoringResult(total, level, version, factors, explanation, mitigations);
    }

    /// <summary>How hard a task has to be before "due tomorrow" is treated as a red flag.</summary>
    public const int HardDifficulty = 4;

    /// <summary>Platform default working day, used when a project has not configured its own.</summary>
    public const int DefaultWorkingHoursPerDay = 8;

    /// <summary>
    /// A weighted average can bury a deadline that is about to land, because four calm factors
    /// outvote one alarming one. These floors say the quiet part outright: work that is overdue,
    /// or hard and due within a day, is high risk regardless of what the average came to.
    /// </summary>
    internal static string Escalate(string level, RiskScoringInput input)
    {
        if (IsDone(input) || !input.Deadline.HasValue) return level;

        var days = input.Deadline.Value.DayNumber - input.Today.DayNumber;

        if (days < 0) return AtLeast(level, "HIGH");
        if (days <= 1 && IsHard(input)) return AtLeast(level, "HIGH");
        return level;
    }

    /// <summary>
    /// Whether the task is heavy enough that an imminent deadline is alarming.
    ///
    /// Either signal is enough, and deliberately so. Difficulty is often an AI suggestion rather
    /// than a human judgement — the estimate writes it — so letting a suggested 3 veto a priority
    /// the author set to High by hand had the machine overruling the person. Priority alone also
    /// has to count, because most tasks never get a difficulty at all.
    /// </summary>
    private static bool IsHard(RiskScoringInput input)
    {
        if (input.Difficulty is int difficulty && difficulty >= HardDifficulty) return true;

        return string.Equals(input.Priority, "High", StringComparison.OrdinalIgnoreCase)
            || string.Equals(input.Priority, "Critical", StringComparison.OrdinalIgnoreCase);
    }

    private static readonly string[] LevelOrder = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

    private static string AtLeast(string level, string floor) =>
        Array.IndexOf(LevelOrder, level) >= Array.IndexOf(LevelOrder, floor) ? level : floor;

    public static string GetRiskLevel(double score) => score switch
    {
        >= 80 => "CRITICAL",
        >= 60 => "HIGH",
        >= 30 => "MEDIUM",
        _ => "LOW"
    };

    private static List<RiskRuleDefinition> NormalizeRules(IReadOnlyCollection<RiskRuleDefinition>? configuredRules)
    {
        var source = configuredRules is { Count: > 0 }
            ? configuredRules.Where(r => DefaultRules.Any(d => d.Code == r.Code) && r.Weight >= 0).ToList()
            : DefaultRules.ToList();

        foreach (var missing in DefaultRules.Where(d => source.All(r => r.Code != d.Code)))
            source.Add(missing);

        var totalWeight = source.Sum(r => r.Weight);
        if (totalWeight <= 0) return DefaultRules.ToList();

        return source.Select(r => r with { Weight = r.Weight / totalWeight }).ToList();
    }

    private static (double Score, string Raw, string Evidence) CalculateDeadline(RiskScoringInput input)
    {
        if (IsDone(input)) return (0, "completed", "Completed tasks have no deadline exposure.");
        if (!input.Deadline.HasValue) return (20, "deadline=missing", "Missing deadline adds planning uncertainty.");

        var days = input.Deadline.Value.DayNumber - input.Today.DayNumber;
        var remainingHours = Math.Max(0, input.EstimatedHours - input.ActualHours);
        if (days < 0) return (100, $"overdueDays={-days}", "Task is overdue and incomplete.");

        var scheduleScore = days switch
        {
            0 => 95,
            <= 1 => 90,
            <= 3 => 75,
            <= 7 => 50,
            <= 14 => 25,
            _ => 10
        };

        // Usable working days, not calendar days. With a deadline on the 5th and today the 3rd,
        // only the 4th is a full day of work: today is already partly spent and the deadline day is
        // when the work is handed over. So it is (days - 1) shifts of 8 hours, floored at one shift
        // so a task due today or tomorrow still divides by something sensible.
        var workingDays = Math.Max(days - 1, 1);
        var hoursPerDay = input.WorkingHoursPerDay is int configured && configured is >= 1 and <= 24
            ? configured
            : DefaultWorkingHoursPerDay;
        var availableHours = workingDays * hoursPerDay;
        var effortPressure = remainingHours <= 0 ? 0 : Math.Clamp(remainingHours / (double)availableHours * 100, 0, 100);
        var score = Math.Max(scheduleScore, effortPressure);
        return (score,
            $"daysRemaining={days};workingDays={workingDays};remainingHours={remainingHours};availableHours={availableHours}",
            $"Deadline proximity and remaining effort against {workingDays} working day(s) of {hoursPerDay}h.");
    }

    private static (double Score, string Raw, string Evidence) CalculateProgress(RiskScoringInput input)
    {
        if (IsDone(input)) return (0, "progress=100", "Task is completed.");

        var progress = Math.Clamp(input.Progress, 0, 100);
        double expectedProgress;
        if (input.Deadline.HasValue && input.CreatedAt.HasValue)
        {
            var created = DateOnly.FromDateTime(input.CreatedAt.Value);
            var totalDays = Math.Max(1, input.Deadline.Value.DayNumber - created.DayNumber);
            var elapsedDays = Math.Clamp(input.Today.DayNumber - created.DayNumber, 0, totalDays);
            expectedProgress = elapsedDays / (double)totalDays * 100;
        }
        else
        {
            expectedProgress = 50;
        }

        var shortfall = Math.Max(0, expectedProgress - progress);
        var score = Math.Clamp(shortfall * 1.5, 0, 100);
        var staleDays = input.LatestProgressAt.HasValue
            ? Math.Max(0, (input.Today.ToDateTime(TimeOnly.MinValue) - input.LatestProgressAt.Value.Date).Days)
            : 14;
        if (staleDays >= 7) score = Math.Max(score, Math.Min(70, 30 + staleDays * 2));

        return (score, $"progress={progress};expected={expectedProgress:F1};staleDays={staleDays}",
            "Progress shortfall against elapsed schedule and update staleness.");
    }

    private static (double Score, string Raw, string Evidence) CalculateDependency(RiskScoringInput input)
    {
        var ratio = input.TotalDependencies <= 0
            ? 0
            : input.IncompleteDependencies / (double)input.TotalDependencies * 100;
        var hasReportedBlocker = !string.IsNullOrWhiteSpace(input.ReportedRisk);
        var score = hasReportedBlocker ? Math.Max(80, ratio) : ratio;
        return (score,
            $"incomplete={input.IncompleteDependencies};total={input.TotalDependencies};reportedBlocker={hasReportedBlocker}",
            hasReportedBlocker ? $"Reported blocker: {input.ReportedRisk}" : "Incomplete task dependencies.");
    }

    private static (double Score, string Raw, string Evidence) CalculateWorkload(RiskScoringInput input)
    {
        var activeTaskPressure = Math.Clamp(input.AverageActiveTaskCount / 5.0 * 100, 0, 100);
        var remainingHours = Math.Max(0, input.EstimatedHours - input.ActualHours);
        var capacityPressure = remainingHours <= 0
            ? 0
            : input.AverageAvailableHours <= 0
                ? 70
                : Math.Clamp(remainingHours / input.AverageAvailableHours * 100, 0, 100);

        var noAssigneePenalty = input.AverageActiveTaskCount < 0 ? 60 : 0;
        var score = Math.Max(noAssigneePenalty, activeTaskPressure * 0.6 + capacityPressure * 0.4);
        return (score,
            $"activeTasks={Math.Max(0, input.AverageActiveTaskCount):F1};availableHours={input.AverageAvailableHours:F1};remainingHours={remainingHours}",
            noAssigneePenalty > 0 ? "Task has no assignee." : "Assignee workload and declared availability.");
    }

    private static (double Score, string Raw, string Evidence) CalculateHistorical(RiskScoringInput input)
    {
        if (!input.AverageDeadlineScore.HasValue)
            return (25, "deadlineScore=missing", "No historical evaluation; uncertainty baseline applied.");

        var score = Math.Clamp((10 - input.AverageDeadlineScore.Value) * 10, 0, 100);
        return (score, $"averageDeadlineScore={input.AverageDeadlineScore.Value:F2}/10", "Historical deadline evaluation.");
    }

    private static List<string> BuildMitigations(IEnumerable<CalculatedRiskFactor> factors)
    {
        var actions = new List<string>();
        foreach (var factor in factors.Where(f => f.Score >= 60).OrderByDescending(f => f.Contribution))
        {
            actions.Add(factor.Code switch
            {
                RiskFactorCodes.Deadline => "Re-estimate remaining work, reduce scope, or negotiate the deadline.",
                RiskFactorCodes.Progress => "Require a progress update and split the remaining work into smaller checkpoints.",
                RiskFactorCodes.Dependency => "Resolve blockers and assign an owner and due date to each incomplete dependency.",
                RiskFactorCodes.Workload => "Rebalance workload or assign an additional qualified member.",
                RiskFactorCodes.Historical => "Add review checkpoints and closer delivery monitoring.",
                _ => "Review this risk factor with the project leader."
            });
        }

        if (actions.Count == 0) actions.Add("Continue monitoring at the next progress update.");
        return actions.Distinct().ToList();
    }

    private static bool IsDone(RiskScoringInput input) =>
        string.Equals(input.Status, "Done", StringComparison.OrdinalIgnoreCase) || input.Progress >= 100;
}
