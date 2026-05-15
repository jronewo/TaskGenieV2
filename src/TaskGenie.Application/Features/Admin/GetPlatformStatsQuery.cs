using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin;

public sealed record PlatformStatsDto(
    int Users,
    int Organizations,
    int Projects,
    int Tasks,
    int TasksDone
);

public sealed record GetPlatformStatsQuery : IRequest<PlatformStatsDto>;

/// <summary>
/// Abstraction to get platform-wide task totals without pulling all task entities into memory.
/// Implemented in Infrastructure so EF Core can use COUNT queries directly.
/// </summary>
public interface ITaskStatsRepository
{
    System.Threading.Tasks.Task<(int Total, int Done)> GetTotalAndDoneCountAsync(CancellationToken ct = default);
}

public sealed class GetPlatformStatsQueryHandler(
    IUserRepository userRepo,
    IOrganizationRepository orgRepo,
    IProjectRepository projectRepo,
    ITaskStatsRepository taskStatsRepo
) : IRequestHandler<GetPlatformStatsQuery, PlatformStatsDto>
{
    public async Task<PlatformStatsDto> Handle(GetPlatformStatsQuery query, CancellationToken ct)
    {
        var users = await userRepo.GetAllAsync(ct);
        var orgs = await orgRepo.GetAllAsync(ct);
        var projects = await projectRepo.GetAllAsync(ct);
        var (total, done) = await taskStatsRepo.GetTotalAndDoneCountAsync(ct);

        return new PlatformStatsDto(
            Users: users.Count,
            Organizations: orgs.Count,
            Projects: projects.Count,
            Tasks: total,
            TasksDone: done
        );
    }
}
