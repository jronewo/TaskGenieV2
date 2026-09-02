using TaskGenie.Application.Common.Agent;
using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Application;

/// <summary>
/// TaskQuery is the only thing a free-form question is allowed to become: a filter over a fixed set
/// of fields, applied entirely in memory to rows the caller already had permission to read. These
/// lock the two properties that make that safe — a filter narrows rather than errors when a value
/// does not parse, and the result is capped no matter what limit is asked for.
/// </summary>
public sealed class TaskQueryTests
{
    private static readonly DateOnly Today = new(2026, 8, 6);

    private static TaskEntity Task(
        int id,
        string title,
        string status = "Todo",
        string? risk = null,
        DateOnly? deadline = null,
        int? difficulty = null,
        bool assigned = false)
    {
        var task = TaskEntity.Create(1, title, null, "Medium", deadline, difficulty: difficulty);
        typeof(TaskEntity).GetProperty(nameof(TaskEntity.TaskId))!.SetValue(task, id);
        task.UpdateProgress(status, null, risk, null);
        if (assigned) task.TaskAssignees.Add(TaskAssignee.Create(id, 9));
        return task;
    }

    [Fact]
    public void FiltersByAnEqualsComparisonOnAStringField()
    {
        List<TaskEntity> tasks =
        [
            Task(1, "Fix login", status: "Todo"),
            Task(2, "Ship report", status: "Done"),
        ];

        var query = new TaskQuery([new TaskFilter(TaskField.Status, Comparison.Equals, "Done")], null, false, 20);

        var result = query.Apply(tasks, Today);

        Assert.Equal([2], result.Select(t => t.TaskId));
    }

    [Fact]
    public void FiltersByDeadlineAsADayOffsetFromToday()
    {
        List<TaskEntity> tasks =
        [
            Task(1, "Overdue", deadline: Today.AddDays(-3)),
            Task(2, "Due later", deadline: Today.AddDays(10)),
        ];

        // The model is told Deadline is an offset from today, not a literal date — this is the
        // contract VertexAiTaskQueryPlanner's system instruction promises it.
        var overdue = new TaskQuery([new TaskFilter(TaskField.Deadline, Comparison.LessThan, "0")], null, false, 20);

        Assert.Equal([1], overdue.Apply(tasks, Today).Select(t => t.TaskId));
    }

    [Fact]
    public void CombinesMultipleFiltersAsAnAnd()
    {
        List<TaskEntity> tasks =
        [
            Task(1, "High risk, in progress", status: "InProgress", risk: "HIGH"),
            Task(2, "High risk, done", status: "Done", risk: "HIGH"),
            Task(3, "Low risk, in progress", status: "InProgress", risk: "LOW"),
        ];

        var query = new TaskQuery(
            [
                new TaskFilter(TaskField.RiskLevel, Comparison.Equals, "HIGH"),
                new TaskFilter(TaskField.Status, Comparison.Equals, "InProgress"),
            ],
            null, false, 20);

        Assert.Equal([1], query.Apply(tasks, Today).Select(t => t.TaskId));
    }

    [Fact]
    public void CountsAssigneesRatherThanReadingThemAsAField()
    {
        List<TaskEntity> tasks =
        [
            Task(1, "Unassigned", assigned: false),
            Task(2, "Assigned", assigned: true),
        ];

        var query = new TaskQuery([new TaskFilter(TaskField.AssigneeCount, Comparison.Equals, "0")], null, false, 20);

        Assert.Equal([1], query.Apply(tasks, Today).Select(t => t.TaskId));
    }

    [Fact]
    public void SortsAscendingOrDescendingByTheChosenField()
    {
        List<TaskEntity> tasks =
        [
            Task(1, "Later", deadline: Today.AddDays(10)),
            Task(2, "Sooner", deadline: Today.AddDays(1)),
        ];

        var ascending = new TaskQuery([], TaskField.Deadline, SortDescending: false, 20);
        Assert.Equal([2, 1], ascending.Apply(tasks, Today).Select(t => t.TaskId));

        var descending = new TaskQuery([], TaskField.Deadline, SortDescending: true, 20);
        Assert.Equal([1, 2], descending.Apply(tasks, Today).Select(t => t.TaskId));
    }

    [Fact]
    public void ALimitAboveTheCapIsClampedRatherThanHonoured()
    {
        var tasks = Enumerable.Range(1, 30).Select(i => Task(i, $"Task {i}")).ToList();

        // A model asked to respect a limit can still return one over it. The cap is enforced here,
        // not trusted from the plan, because a chat bubble listing dozens of rows helps nobody.
        var query = new TaskQuery([], null, false, Limit: 500);

        Assert.Equal(TaskQuery.MaxLimit, query.Apply(tasks, Today).Count);
    }

    [Fact]
    public void AValueThatDoesNotParseFailsTheFilterInsteadOfThrowing()
    {
        List<TaskEntity> tasks = [Task(1, "Has a difficulty", difficulty: 3)];

        // A planner error should narrow the result to nothing, not crash the assistant mid-answer.
        var query = new TaskQuery([new TaskFilter(TaskField.Difficulty, Comparison.GreaterThan, "not-a-number")], null, false, 20);

        Assert.Empty(query.Apply(tasks, Today));
    }

    [Fact]
    public void IsNullAndIsNotNullDoNotNeedAValue()
    {
        List<TaskEntity> tasks =
        [
            Task(1, "No deadline", deadline: null),
            Task(2, "Has a deadline", deadline: Today.AddDays(5)),
        ];

        var noDeadline = new TaskQuery([new TaskFilter(TaskField.Deadline, Comparison.IsNull, null)], null, false, 20);
        Assert.Equal([1], noDeadline.Apply(tasks, Today).Select(t => t.TaskId));

        var hasDeadline = new TaskQuery([new TaskFilter(TaskField.Deadline, Comparison.IsNotNull, null)], null, false, 20);
        Assert.Equal([2], hasDeadline.Apply(tasks, Today).Select(t => t.TaskId));
    }

    [Fact]
    public void ContainsIsCaseInsensitiveOnStringFields()
    {
        List<TaskEntity> tasks = [Task(1, "Anything", status: "InProgress")];

        var query = new TaskQuery([new TaskFilter(TaskField.Status, Comparison.Contains, "progress")], null, false, 20);

        Assert.Single(query.Apply(tasks, Today));
    }

    [Fact]
    public void AnEmptyQueryReturnsEveryTaskUpToTheDefaultLimit()
    {
        List<TaskEntity> tasks = [Task(1, "A"), Task(2, "B")];

        Assert.Equal(2, TaskQuery.Empty.Apply(tasks, Today).Count);
    }
}
