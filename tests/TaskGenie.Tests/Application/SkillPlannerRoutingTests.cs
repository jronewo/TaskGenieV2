using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TaskGenie.Application.Common.Agent;
using TaskGenie.Application.Features.Tasks.Commands;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Tests.Application;

/// <summary>
/// The planner widens which sentences are understood; it must not widen what the assistant is
/// allowed to do. These lock both halves: a sentence no pattern was written for still reaches the
/// right skill, and a planner that answers nonsense — or nothing at all — changes no data.
/// </summary>
public sealed class SkillPlannerRoutingTests
{
    private static RuleBasedProjectAgent Agent(
        Mock<IMediator> mediator,
        ISkillPlanner? planner = null,
        Mock<ITaskRepository>? taskRepo = null)
    {
        var currentUser = new Mock<ICurrentUser>();
        currentUser.SetupGet(u => u.UserId).Returns(42);

        return new RuleBasedProjectAgent(
            mediator.Object,
            currentUser.Object,
            new Mock<IResourceAuthorizationService>().Object,
            (taskRepo ?? new Mock<ITaskRepository>()).Object,
            NullLogger<RuleBasedProjectAgent>.Instance,
            planner);
    }

    private static ISkillPlanner PlannerReturning(SkillPlan? plan)
    {
        var planner = new Mock<ISkillPlanner>();
        planner
            .Setup(p => p.PlanAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<PlannerSkill>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(plan);
        return planner.Object;
    }

    private static Mock<IMediator> MediatorCreatingTasks()
    {
        var mediator = new Mock<IMediator>();
        mediator
            .Setup(m => m.Send(It.IsAny<CreateTaskCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreateTaskCommand command, CancellationToken _) =>
                new TaskDetailDto { TaskId = 500, Title = command.Title, ProjectId = command.ProjectId });
        return mediator;
    }

    [Fact]
    public async Task ASentenceNoPatternWasWrittenFor_StillReachesTheRightSkill()
    {
        var mediator = MediatorCreatingTasks();
        // The exact sentence that motivated this: it asks to create a task, but not in the shape
        // "tạo task tên là X" that the pattern requires.
        const string message = "thêm việc sửa lỗi login cho tôi đi";
        Assert.Null(AssistantSkillRegistry.Match(message));

        var planner = PlannerReturning(new SkillPlan("create-task", new Dictionary<string, string>
        {
            ["title"] = "Sửa lỗi login",
        }));

        var reply = await Agent(mediator, planner).RunAsync(message, projectId: 7);

        mediator.Verify(
            m => m.Send(It.Is<CreateTaskCommand>(c => c.Title == "Sửa lỗi login" && c.ProjectId == 7), It.IsAny<CancellationToken>()),
            Times.Once);
        Assert.Contains("Sửa lỗi login", reply.Answer);
    }

    [Fact]
    public async Task WhenAPatternAlreadyMatches_ThePlannerIsNotAsked()
    {
        var mediator = MediatorCreatingTasks();
        var planner = new Mock<ISkillPlanner>();

        // Patterns are exact and free; paying a model to re-decide something already decided would
        // add latency and cost to every well-formed sentence.
        await Agent(mediator, planner.Object).RunAsync("tạo task tên là Viết tài liệu", projectId: 7);

        planner.Verify(
            p => p.PlanAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<PlannerSkill>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task APlannerNamingASkillThatDoesNotExist_ChangesNothing()
    {
        var mediator = new Mock<IMediator>();
        var planner = PlannerReturning(new SkillPlan("delete_everything", new Dictionary<string, string>()));

        var reply = await Agent(mediator, planner).RunAsync("xoá sạch dữ liệu đi", projectId: 7);

        // The id is looked up in the registry, so a name the registry does not know is a dead end
        // rather than a new capability.
        mediator.Verify(m => m.Send(It.IsAny<IRequest<object>>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Contains("chưa hiểu", reply.Answer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task APlannerThatIsDown_LeavesTheAssistantAnswering()
    {
        var mediator = new Mock<IMediator>();
        var planner = new Mock<ISkillPlanner>();
        planner
            .Setup(p => p.PlanAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<PlannerSkill>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Vertex AI unreachable"));

        var reply = await Agent(mediator, planner.Object).RunAsync("thêm việc gì đó", projectId: 7);

        // An outage must not surface as an error page: this is the failure that killed the previous
        // LLM-backed assistant, so it degrades to the same answer as an unrecognised sentence.
        Assert.Contains("chưa hiểu", reply.Answer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task WithNoPlannerConfigured_TheAssistantStillRunsOnPatterns()
    {
        var mediator = MediatorCreatingTasks();

        var reply = await Agent(mediator, planner: null).RunAsync("tạo task tên là Viết tài liệu", projectId: 7);

        Assert.Contains("Viết tài liệu", reply.Answer);
    }

    [Fact]
    public async Task ThePlannerIsOfferedEverySkillTheRegistryDeclares()
    {
        var mediator = new Mock<IMediator>();
        IReadOnlyList<PlannerSkill> offered = [];
        var planner = new Mock<ISkillPlanner>();
        planner
            .Setup(p => p.PlanAsync(It.IsAny<string>(), It.IsAny<IReadOnlyList<PlannerSkill>>(), It.IsAny<CancellationToken>()))
            .Callback((string _, IReadOnlyList<PlannerSkill> skills, CancellationToken _) => offered = skills)
            .ReturnsAsync((SkillPlan?)null);

        await Agent(mediator, planner.Object).RunAsync("câu gì đó không khớp mẫu nào cả", projectId: 7);

        // A skill added to the registry must become understandable without a second list to update.
        Assert.Equal(
            AssistantSkillRegistry.All.Select(s => s.Id).OrderBy(id => id),
            offered.Select(s => s.Id).OrderBy(id => id));
    }

    [Fact]
    public async Task ASkillThatWritesStillRefusesWhenTheModelLeftTheNameOut()
    {
        var mediator = new Mock<IMediator>();
        // The planner is told to leave unknown arguments empty rather than invent them, so the
        // skill's own validation is what stands between a vague sentence and a junk row.
        var planner = PlannerReturning(new SkillPlan("create-task", new Dictionary<string, string>()));

        var reply = await Agent(mediator, planner).RunAsync("thêm việc gì đó cho tôi", projectId: 7);

        mediator.Verify(m => m.Send(It.IsAny<CreateTaskCommand>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.Contains("tên là gì", reply.Answer, StringComparison.OrdinalIgnoreCase);
    }
}
