using TaskGenie.Application.Common.Agent;
using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Application;

/// <summary>
/// The answers the chat box gives without a model. These are the questions people ask most, and
/// they must stay exact — the whole point of not routing them through an LLM is that a count is a
/// count.
/// </summary>
public sealed class WorkspaceDiagnosticsTests
{
    private static readonly DateOnly Today = new(2026, 8, 2);

    private static TaskEntity Task(
        int id,
        string title,
        string status = "Todo",
        string? risk = null,
        DateOnly? deadline = null,
        bool assigned = false)
    {
        var task = TaskEntity.Create(1, title, null, "Medium", deadline);
        typeof(TaskEntity).GetProperty(nameof(TaskEntity.TaskId))!.SetValue(task, id);
        task.UpdateProgress(status, null, risk, null);
        if (assigned) task.TaskAssignees.Add(TaskAssignee.Create(id, 9));
        return task;
    }

    [Theory]
    [InlineData("task nào đang rủi ro?", DiagnosticIntent.AtRisk)]
    [InlineData("tính toán risk estimate giúp tôi", DiagnosticIntent.AtRisk)]
    [InlineData("task nào sắp đến hạn", DiagnosticIntent.DueSoon)]
    [InlineData("what is due soon", DiagnosticIntent.DueSoon)]
    [InlineData("có task nào quá hạn không", DiagnosticIntent.Overdue)]
    [InlineData("task nào chưa được assign", DiagnosticIntent.Unassigned)]
    [InlineData("hôm nay đang làm gì", DiagnosticIntent.InProgress)]
    [InlineData("cho tôi tổng quan", DiagnosticIntent.Overview)]
    public void RecognisedQuestions_MapToAnIntent(string question, DiagnosticIntent expected)
    {
        Assert.Equal(expected, WorkspaceDiagnostics.Detect(question));
    }

    [Theory]
    [InlineData("viết cho tôi một bài thơ")]
    [InlineData("gán task 5 cho Linh")]
    [InlineData("")]
    [InlineData(null)]
    public void UnrecognisedQuestions_FallThroughToTheModel(string? question)
    {
        // Guessing here would produce a confident answer to a question nobody asked.
        Assert.Equal(DiagnosticIntent.None, WorkspaceDiagnostics.Detect(question));
    }

    [Fact]
    public void Overdue_IsNotConfusedWithDueSoon()
    {
        // "quá hạn" contains no deadline phrase, but the ordering still has to hold.
        Assert.Equal(DiagnosticIntent.Overdue, WorkspaceDiagnostics.Detect("task nào trễ deadline"));
    }

    [Fact]
    public void AtRisk_ListsOnlyOpenHighAndCriticalTasks()
    {
        var tasks = new[]
        {
            Task(1, "Risky", risk: "HIGH"),
            Task(2, "Critical one", risk: "CRITICAL"),
            Task(3, "Calm", risk: "LOW"),
            Task(4, "Finished but risky", status: "Done", risk: "HIGH"),
        };

        var answer = WorkspaceDiagnostics.Answer(DiagnosticIntent.AtRisk, tasks, Today, "Alpha");

        Assert.Contains("(2)", answer);
        Assert.Contains("Risky", answer);
        Assert.Contains("Critical one", answer);
        Assert.DoesNotContain("Calm", answer);
        // Something already delivered is not a risk any more.
        Assert.DoesNotContain("Finished but risky", answer);
    }

    [Fact]
    public void DueSoon_UsesAFiveDayWindowAndExcludesOverdue()
    {
        var tasks = new[]
        {
            Task(1, "Tomorrow", deadline: Today.AddDays(1)),
            Task(2, "Day five", deadline: Today.AddDays(5)),
            Task(3, "Day six", deadline: Today.AddDays(6)),
            Task(4, "Yesterday", deadline: Today.AddDays(-1)),
        };

        var answer = WorkspaceDiagnostics.Answer(DiagnosticIntent.DueSoon, tasks, Today, "Alpha");

        Assert.Contains("Tomorrow", answer);
        Assert.Contains("Day five", answer);
        Assert.DoesNotContain("Day six", answer);
        // Already late is a different question with a different answer.
        Assert.DoesNotContain("Yesterday", answer);
    }

    [Fact]
    public void DueSoon_CountsTheDaysRemaining()
    {
        var tasks = new[] { Task(1, "Soon", deadline: Today.AddDays(3)) };

        Assert.Contains("còn 3 ngày", WorkspaceDiagnostics.Answer(DiagnosticIntent.DueSoon, tasks, Today, "Alpha"));
    }

    [Fact]
    public void Overdue_CountsHowLate()
    {
        var tasks = new[] { Task(1, "Late", deadline: Today.AddDays(-4)) };

        Assert.Contains("trễ 4 ngày", WorkspaceDiagnostics.Answer(DiagnosticIntent.Overdue, tasks, Today, "Alpha"));
    }

    [Fact]
    public void Unassigned_IgnoresTasksThatAreAlreadyDone()
    {
        var tasks = new[]
        {
            Task(1, "Nobody"),
            Task(2, "Taken", assigned: true),
            Task(3, "Done and unassigned", status: "Done"),
        };

        var answer = WorkspaceDiagnostics.Answer(DiagnosticIntent.Unassigned, tasks, Today, "Alpha");

        Assert.Contains("Nobody", answer);
        Assert.DoesNotContain("Taken", answer);
        Assert.DoesNotContain("Done and unassigned", answer);
    }

    [Fact]
    public void Overview_ReportsEveryHeadlineNumber()
    {
        var tasks = new[]
        {
            Task(1, "A", status: "Todo", risk: "HIGH"),
            Task(2, "B", status: "InProgress", deadline: Today.AddDays(2)),
            Task(3, "C", status: "Done"),
            Task(4, "D", status: "Todo", deadline: Today.AddDays(-1)),
        };

        var answer = WorkspaceDiagnostics.Answer(DiagnosticIntent.Overview, tasks, Today, "Alpha");

        Assert.Contains("4 công việc", answer);
        Assert.Contains("Rủi ro cao: 1", answer);
        Assert.Contains("Quá hạn: 1", answer);
        Assert.Contains("Đến hạn trong 5 ngày: 1", answer);
    }

    [Fact]
    public void EmptyResults_SayNothingIsWrongRatherThanShowingAnEmptyList()
    {
        var calm = new[] { Task(1, "Fine", risk: "LOW") };

        var answer = WorkspaceDiagnostics.Answer(DiagnosticIntent.AtRisk, calm, Today, "Alpha");

        Assert.Contains("Không có công việc nào", answer);
        Assert.DoesNotContain("•", answer);
    }

    [Fact]
    public void LongResults_AreCappedSoTheChatBubbleStaysReadable()
    {
        var many = Enumerable.Range(1, 20).Select(i => Task(i, $"Task {i}", risk: "HIGH")).ToArray();

        var answer = WorkspaceDiagnostics.Answer(DiagnosticIntent.AtRisk, many, Today, "Alpha");

        Assert.Contains("(20)", answer);
        Assert.Contains("và 8 công việc khác", answer);
        Assert.Equal(12, answer.Split('•').Length - 1);
    }
}
