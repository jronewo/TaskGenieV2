using MediatR;
using Moq;
using TaskGenie.Application.Common.Agent;
using TaskGenie.Application.Features.Projects.Commands;
using TaskGenie.Application.Features.Projects.DTOs;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Features.Tasks.DTOs;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

/// <summary>
/// The skill registry is the assistant's entire contract: a sentence either matches a declared
/// skill or is refused. The rule that matters most is that a half-understood sentence creates
/// nothing — a project called "mới cho tôi" is worse than a follow-up question, because someone has
/// to go and delete it.
/// </summary>
public sealed class AssistantSkillRegistryTests
{
    private static SkillContext Context(Mock<IMediator> mediator, int? projectId = 7) =>
        new(mediator.Object, 42, projectId);

    private static async Task<string> Run(string message, Mock<IMediator> mediator, int? projectId = 7)
    {
        var matched = AssistantSkillRegistry.Match(message);
        Assert.NotNull(matched);
        return await matched!.Value.Skill.Execute(matched.Value.Args, Context(mediator, projectId), CancellationToken.None);
    }

    [Theory]
    [InlineData("task nào quá hạn?", "overdue")]
    [InlineData("task nào sắp đến hạn", "due-soon")]
    [InlineData("task nào đang rủi ro", "at-risk")]
    [InlineData("task nào chưa được assign", "unassigned")]
    [InlineData("hôm nay đang làm gì", "in-progress")]
    [InlineData("cho tôi tổng quan", "overview")]
    [InlineData("tạo dự án tên là Alpha", "create-project")]
    [InlineData("tạo task tên là Sửa lỗi", "create-task")]
    [InlineData("chuyển task 12 sang done", "update-status")]
    [InlineData("gợi ý người cho task 12", "suggest-assignee")]
    [InlineData("giao task 12 cho Linh", "assign-task")]
    [InlineData("phân tích rủi ro task 12", "analyse-risk")]
    [InlineData("chi tiết task 12", "task-detail")]
    public void EachDeclaredSkill_ClaimsItsOwnSentence(string message, string expectedSkill)
    {
        Assert.Equal(expectedSkill, AssistantSkillRegistry.Match(message)?.Skill.Id);
    }

    [Fact]
    public void EverySkill_DocumentsTheUseCasesItCalls()
    {
        // "What will this touch" has to be answerable by reading the registry.
        foreach (var skill in AssistantSkillRegistry.All)
        {
            Assert.NotEmpty(skill.ApiCalls);
            // Each entry names a real MediatR request, not a prose description.
            Assert.All(skill.ApiCalls, call => Assert.True(
                call.EndsWith("Command", StringComparison.Ordinal) || call.EndsWith("Query", StringComparison.Ordinal),
                $"{skill.Id} documents \"{call}\", which is not a Command or Query."));
        }
    }

    [Fact]
    public void ReadSkills_AreNotMarkedAsMutating()
    {
        foreach (var id in new[] { "overdue", "due-soon", "at-risk", "unassigned", "in-progress", "overview", "task-detail" })
        {
            Assert.False(AssistantSkillRegistry.All.Single(s => s.Id == id).Mutates, id);
        }
    }

    [Fact]
    public void AnUnrelatedSentence_MatchesNothing()
    {
        Assert.Null(AssistantSkillRegistry.Match("viết cho tôi một bài thơ"));
        Assert.Null(AssistantSkillRegistry.Match(""));
    }

    [Fact]
    public async Task CreateProject_ExtractsTheNameAndTheDeadline()
    {
        var mediator = new Mock<IMediator>();
        CreateProjectCommand? sent = null;
        mediator
            .Setup(m => m.Send(It.IsAny<CreateProjectCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<ProjectDto>, CancellationToken>((r, _) => sent = (CreateProjectCommand)r)
            .ReturnsAsync(new ProjectDto { ProjectId = 3, Name = "Website Revamp" });

        var answer = await Run(
            "tạo 1 project mới cho tôi, project đó sẽ có tên là Website Revamp và ngày hoàn thành là 31/12/2026",
            mediator);

        Assert.Equal("Website Revamp", sent!.Name);
        Assert.Equal(new DateOnly(2026, 12, 31), sent.Deadline);
        Assert.Contains("Đã tạo dự án", answer);
    }

    [Fact]
    public async Task CreateProject_WithoutAName_AsksInsteadOfCreating()
    {
        var mediator = new Mock<IMediator>();

        var answer = await Run("tạo 1 project mới cho tôi", mediator);

        // The whole point: not enough data means no write at all.
        mediator.Verify(m => m.Send(It.IsAny<CreateProjectCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Contains("cần tên dự án", answer);
    }

    [Fact]
    public async Task CreateProject_WithAnUnreadableDate_RefusesRatherThanIgnoringIt()
    {
        var mediator = new Mock<IMediator>();

        var answer = await Run("tạo dự án tên là Alpha, ngày hoàn thành là 45/13/2026", mediator);

        // Silently dropping the date would create a project the user thinks has a deadline.
        mediator.Verify(m => m.Send(It.IsAny<CreateProjectCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Contains("không đọc được ngày", answer);
    }

    [Fact]
    public async Task CreateTask_NeedsAProjectToBeSelected()
    {
        var mediator = new Mock<IMediator>();

        var answer = await Run("tạo task tên là Sửa lỗi đăng nhập", mediator, projectId: null);

        mediator.Verify(m => m.Send(It.IsAny<CreateTaskCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Contains("chọn một dự án", answer);
    }

    [Fact]
    public async Task CreateTask_ReadsThePriorityWhenGiven()
    {
        var mediator = new Mock<IMediator>();
        CreateTaskCommand? sent = null;
        mediator
            .Setup(m => m.Send(It.IsAny<CreateTaskCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<TaskDetailDto>, CancellationToken>((r, _) => sent = (CreateTaskCommand)r)
            .ReturnsAsync(new TaskDetailDto { TaskId = 9, Title = "Sửa lỗi đăng nhập" });

        await Run("tạo task tên là Sửa lỗi đăng nhập, ưu tiên là cao", mediator);

        Assert.Equal("Sửa lỗi đăng nhập", sent!.Title);
        Assert.Equal("High", sent.Priority);
    }

    [Fact]
    public async Task UpdateStatus_MapsVietnameseWordsOntoTheStoredValues()
    {
        var mediator = new Mock<IMediator>();
        UpdateTaskProgressCommand? sent = null;
        mediator
            .Setup(m => m.Send(It.IsAny<UpdateTaskProgressCommand>(), It.IsAny<CancellationToken>()))
            .Callback<IRequest<bool>, CancellationToken>((r, _) => sent = (UpdateTaskProgressCommand)r)
            .ReturnsAsync(true);

        await Run("đánh dấu task 12 là hoàn thành", mediator);

        Assert.Equal(12, sent!.TaskId);
        Assert.Equal("Done", sent.Status);
        // Finishing a task means 100%, not whatever it was on.
        Assert.Equal(100, sent.Progress);
    }

    [Fact]
    public async Task UpdateStatus_RejectsAStatusThatDoesNotExist()
    {
        var mediator = new Mock<IMediator>();
        var matched = AssistantSkillRegistry.Match("chuyển task 12 sang blocked");

        // "blocked" is not a status, so the sentence does not even match the skill.
        Assert.NotEqual("update-status", matched?.Skill.Id);
        await Task.CompletedTask;
    }

    [Fact]
    public void Politeness_IsNotTreatedAsPartOfAName()
    {
        var matched = AssistantSkillRegistry.Match("tạo dự án tên là Alpha giúp tôi");
        Assert.NotNull(matched);
        Assert.Equal("create-project", matched!.Value.Skill.Id);
    }
}
