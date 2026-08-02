using TaskGenie.Application.Features.AI.Services;

namespace TaskGenie.Tests.Application;

/// <summary>
/// The deadline floors. A weighted average across five factors can bury an imminent date — four
/// calm factors outvote one alarming one — which is how a hard task due tomorrow came out MEDIUM.
/// </summary>
public sealed class RiskEscalationTests
{
    private static readonly DateOnly Today = new(2026, 8, 2);

    private static RiskScoringInput Input(
        int daysUntilDeadline,
        int? difficulty,
        string status = "Todo",
        int progress = 0,
        string? priority = "Medium") =>
        new(
            Today: Today,
            Status: status,
            Progress: progress,
            Deadline: Today.AddDays(daysUntilDeadline),
            CreatedAt: Today.AddDays(-5).ToDateTime(TimeOnly.MinValue),
            EstimatedHours: 8,
            ActualHours: 0,
            TotalDependencies: 0,
            IncompleteDependencies: 0,
            ReportedRisk: null,
            LatestProgressAt: Today.ToDateTime(TimeOnly.MinValue),
            AverageActiveTaskCount: 1,
            AverageAvailableHours: 8,
            AverageDeadlineScore: 8,
            Difficulty: difficulty,
            Priority: priority);

    [Fact]
    public void AHardTaskDueTomorrow_IsHighRisk()
    {
        var result = new RiskScoringEngine().Calculate(Input(1, difficulty: 5));

        Assert.Equal("HIGH", result.RiskLevel);
    }

    [Fact]
    public void AHardTaskDueToday_IsHighRisk()
    {
        var result = new RiskScoringEngine().Calculate(Input(0, difficulty: 4));

        Assert.Equal("HIGH", result.RiskLevel);
    }

    [Fact]
    public void AnEasyTaskDueTomorrow_IsNotEscalated()
    {
        // The floor is deliberately narrow: every task is due eventually, and escalating easy work
        // that is nearly finished would make the red badge meaningless. Progress is set high so the
        // base score is low — this isolates the floor from the ordinary weighting.
        var result = new RiskScoringEngine().Calculate(Input(1, difficulty: 1, progress: 95));

        Assert.NotEqual("HIGH", result.RiskLevel);
    }

    [Fact]
    public void AnUnstartedTaskDueTomorrow_IsHighOnItsScoreAlone()
    {
        // No floor needed here: nothing done, one day left — the weighting already says HIGH.
        var result = new RiskScoringEngine().Calculate(Input(1, difficulty: 1));

        Assert.Equal("HIGH", result.RiskLevel);
    }

    [Fact]
    public void AHardTaskDueNextWeek_IsNotEscalated()
    {
        var result = new RiskScoringEngine().Calculate(Input(7, difficulty: 5));

        Assert.NotEqual("HIGH", result.RiskLevel);
    }

    [Fact]
    public void AHighPriorityTaskDueTomorrow_IsHighRiskEvenWithNoDifficultySet()
    {
        // Difficulty is optional and usually blank, so treating "unset" as "not hard" meant the
        // floor almost never fired — priority is what the author actually filled in.
        var result = new RiskScoringEngine().Calculate(
            Input(1, difficulty: null, progress: 95, priority: "High"));

        Assert.Equal("HIGH", result.RiskLevel);
        Assert.Contains("High priority", result.Explanation);
    }

    [Fact]
    public void ALowPriorityTaskDueTomorrow_WithNoDifficulty_IsNotEscalated()
    {
        var result = new RiskScoringEngine().Calculate(
            Input(1, difficulty: null, progress: 95, priority: "Low"));

        Assert.NotEqual("HIGH", result.RiskLevel);
    }

    [Fact]
    public void AHighPriority_CountsEvenWhenTheSuggestedDifficultyIsLow()
    {
        // Difficulty is usually written by the AI estimate, not a person. Letting a suggested 3 veto
        // a priority the author set by hand put the machine's guess above the human's judgement.
        var result = new RiskScoringEngine().Calculate(
            Input(1, difficulty: 3, progress: 95, priority: "Critical"));

        Assert.Equal("HIGH", result.RiskLevel);
        Assert.Contains("Critical priority", result.Explanation);
    }

    [Fact]
    public void AnOverdueTask_IsHighRiskWhateverItsDifficulty()
    {
        var result = new RiskScoringEngine().Calculate(Input(-1, difficulty: null));

        Assert.Equal("HIGH", result.RiskLevel);
    }

    [Fact]
    public void ACompletedTask_IsNeverEscalated()
    {
        // Finishing late is a fact about the past, not a risk to act on.
        var result = new RiskScoringEngine().Calculate(Input(-3, difficulty: 5, status: "Done", progress: 100));

        Assert.Equal("LOW", result.RiskLevel);
    }

    [Fact]
    public void AnEscalatedLevel_SaysWhyItWasRaised()
    {
        // Nearly finished, so the score is calm — the floor is what makes this HIGH, and the
        // explanation has to admit that or the number and the badge look inconsistent.
        var result = new RiskScoringEngine().Calculate(Input(1, difficulty: 5, progress: 95));

        Assert.Equal("HIGH", result.RiskLevel);
        Assert.Contains("Raised to HIGH", result.Explanation);
        Assert.Contains("difficulty 5/5", result.Explanation);
    }

    [Fact]
    public void TheFloorRaisesAndNeverLowers()
    {
        // A long-overdue task scores 71 — already above the floor, so the floor leaves it alone.
        var result = new RiskScoringEngine().Calculate(Input(-30, difficulty: 5));

        Assert.Equal("HIGH", result.RiskLevel);
        Assert.True(result.TotalScore >= 60);
    }
}

/// <summary>
/// Capacity is counted in working shifts. A deadline three calendar days out is not 72 hours of
/// availability, and treating it that way made every estimate look comfortable.
/// </summary>
public sealed class RiskCapacityTests
{
    private static readonly DateOnly Today = new(2026, 8, 3);

    private static RiskScoringInput Input(DateOnly deadline, int estimatedHours, int? hoursPerDay = null) =>
        new(
            Today: Today,
            Status: "InProgress",
            Progress: 0,
            Deadline: deadline,
            CreatedAt: Today.ToDateTime(TimeOnly.MinValue),
            EstimatedHours: estimatedHours,
            ActualHours: 0,
            TotalDependencies: 0,
            IncompleteDependencies: 0,
            ReportedRisk: null,
            LatestProgressAt: Today.ToDateTime(TimeOnly.MinValue),
            AverageActiveTaskCount: 1,
            AverageAvailableHours: 8,
            AverageDeadlineScore: 8,
            Difficulty: 2,
            Priority: "Medium",
            WorkingHoursPerDay: hoursPerDay);

    [Fact]
    public void ADeadlineTwoDaysOut_CountsOneWorkingDay()
    {
        // The user's own example: deadline the 5th, today the 3rd — one full working day, the 4th.
        var result = new RiskScoringEngine().Calculate(Input(new DateOnly(2026, 8, 5), estimatedHours: 8));

        var deadline = result.Factors.Single(f => f.Code == RiskFactorCodes.Deadline);
        Assert.Contains("workingDays=1", deadline.RawValue);
        Assert.Contains("availableHours=8", deadline.RawValue);
    }

    [Fact]
    public void EightHoursOfWorkInOneWorkingDay_IsFullPressure()
    {
        var result = new RiskScoringEngine().Calculate(Input(new DateOnly(2026, 8, 5), estimatedHours: 8));

        var deadline = result.Factors.Single(f => f.Code == RiskFactorCodes.Deadline);
        Assert.Equal(100, deadline.Score);
    }

    [Fact]
    public void AWeekOut_CountsSixWorkingDays()
    {
        var result = new RiskScoringEngine().Calculate(Input(new DateOnly(2026, 8, 10), estimatedHours: 8));

        var deadline = result.Factors.Single(f => f.Code == RiskFactorCodes.Deadline);
        Assert.Contains("availableHours=48", deadline.RawValue);
    }

    [Fact]
    public void ADeadlineTomorrow_StillHasOneShiftOfCapacity()
    {
        // Never zero: dividing remaining effort by nothing would send every such task to 100 by
        // arithmetic rather than by judgement.
        var result = new RiskScoringEngine().Calculate(Input(new DateOnly(2026, 8, 4), estimatedHours: 4));

        var deadline = result.Factors.Single(f => f.Code == RiskFactorCodes.Deadline);
        Assert.Contains("availableHours=8", deadline.RawValue);
    }

    [Fact]
    public void AProjectWithAShorterDay_HasLessCapacity()
    {
        // A school project running two hours an evening must not be measured against a company shift.
        var result = new RiskScoringEngine().Calculate(
            Input(new DateOnly(2026, 8, 10), estimatedHours: 8, hoursPerDay: 2));

        var deadline = result.Factors.Single(f => f.Code == RiskFactorCodes.Deadline);
        Assert.Contains("availableHours=12", deadline.RawValue); // 6 working days x 2h
    }

    [Fact]
    public void AnOutOfRangeConfiguration_FallsBackToTheDefault()
    {
        var result = new RiskScoringEngine().Calculate(
            Input(new DateOnly(2026, 8, 10), estimatedHours: 8, hoursPerDay: 0));

        var deadline = result.Factors.Single(f => f.Code == RiskFactorCodes.Deadline);
        Assert.Contains("availableHours=48", deadline.RawValue);
    }
}
