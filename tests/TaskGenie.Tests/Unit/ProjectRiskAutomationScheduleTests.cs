using TaskGenie.Domain.Entities;

namespace TaskGenie.Tests.Unit;

/// <summary>
/// The schedule rule behind the hourly sweep. It is the part that decides whether a project's risk
/// estimate re-runs, so it is worth pinning down away from the worker's plumbing: an off-by-one
/// here either skips a day or re-runs the whole board every hour.
/// </summary>
public sealed class ProjectRiskAutomationScheduleTests
{
    private static Project ScheduledAt(int hourUtc)
    {
        var project = Project.Create("Scheduled", null, createdBy: 1);
        project.SetRiskAutomationHour(hourUtc);
        return project;
    }

    [Fact]
    public void AProjectWithNoScheduleIsNeverDue()
    {
        var project = Project.Create("Unscheduled", null, createdBy: 1);

        Assert.False(project.IsRiskAutomationDue(new DateTime(2026, 8, 4, 23, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void IsDueOnceTheClockReachesTheScheduledHour()
    {
        var project = ScheduledAt(2);

        Assert.False(project.IsRiskAutomationDue(new DateTime(2026, 8, 4, 1, 30, 0, DateTimeKind.Utc)));
        Assert.True(project.IsRiskAutomationDue(new DateTime(2026, 8, 4, 2, 0, 0, DateTimeKind.Utc)));
    }

    /// <summary>The hourly tick must be idempotent — this is what stops it re-running all day.</summary>
    [Fact]
    public void IsNotDueAgainOnceItHasAlreadyRunToday()
    {
        var project = ScheduledAt(2);
        var runAt = new DateTime(2026, 8, 4, 2, 0, 0, DateTimeKind.Utc);
        project.MarkRiskAutomationRun(runAt);

        Assert.False(project.IsRiskAutomationDue(runAt.AddHours(3)));
        // A new day makes it due again.
        Assert.True(project.IsRiskAutomationDue(runAt.AddDays(1)));
    }

    /// <summary>A missed window still runs later the same day rather than being skipped: an app
    /// restarted at 09:00 must not silently drop a 02:00 schedule.</summary>
    [Fact]
    public void CatchesUpLaterTheSameDayWhenTheHourWasMissed()
    {
        var project = ScheduledAt(2);

        Assert.True(project.IsRiskAutomationDue(new DateTime(2026, 8, 4, 9, 0, 0, DateTimeKind.Utc)));
    }

    /// <summary>A finished project has nothing left to re-score.</summary>
    [Fact]
    public void AClosedProjectIsNeverDue()
    {
        var project = ScheduledAt(2);
        project.Close();

        Assert.False(project.IsRiskAutomationDue(new DateTime(2026, 8, 4, 5, 0, 0, DateTimeKind.Utc)));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(24)]
    public void RejectsAnHourOutsideTheDay(int hour)
    {
        var project = Project.Create("Scheduled", null, createdBy: 1);

        Assert.Throws<ArgumentOutOfRangeException>(() => project.SetRiskAutomationHour(hour));
    }

    [Fact]
    public void SchedulingNullSwitchesTheAutomationOff()
    {
        var project = ScheduledAt(2);
        project.SetRiskAutomationHour(null);

        Assert.Null(project.RiskAutomationHourUtc);
        Assert.False(project.IsRiskAutomationDue(new DateTime(2026, 8, 4, 5, 0, 0, DateTimeKind.Utc)));
    }
}
