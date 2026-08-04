using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

/// <summary>
/// Schedules the daily automated risk estimate, or switches it off with a null hour.
///
/// Leader-only, like every other project setting: turning it on spends the project's share of a
/// rate-limited AI quota every day, which is not a decision a member gets to make.
/// </summary>
public sealed record SetProjectRiskAutomationCommand(int ProjectId, int? HourUtc) : IRequest<int?>;

public sealed class SetProjectRiskAutomationCommandHandler(
    IResourceAuthorizationService authz,
    IProjectRepository projectRepo
) : IRequestHandler<SetProjectRiskAutomationCommand, int?>
{
    public async Task<int?> Handle(SetProjectRiskAutomationCommand cmd, CancellationToken ct)
    {
        var project = await authz.EnsureCanManageProjectAsync(cmd.ProjectId, ct);

        if (project.IsClosed)
            throw new InvalidOperationException("Dự án đã đóng, không đặt lịch chạy tự động được.");

        project.SetRiskAutomationHour(cmd.HourUtc);
        await projectRepo.UpdateAsync(project, ct);
        return project.RiskAutomationHourUtc;
    }
}
