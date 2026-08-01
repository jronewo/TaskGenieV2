using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin;

public sealed record PlatformStatsDto(
    int Users,
    int ActiveUsers,
    int Organizations,
    int Projects,
    int ActiveSubscriptions,
    long RevenueCents,
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
    ITaskStatsRepository taskStatsRepo,
    ISubscriptionRepository subscriptionRepo,
    IPaymentTransactionRepository paymentRepo
) : IRequestHandler<GetPlatformStatsQuery, PlatformStatsDto>
{
    public async Task<PlatformStatsDto> Handle(GetPlatformStatsQuery query, CancellationToken ct)
    {
        var users = await userRepo.GetAllAsync(ct);
        var orgs = await orgRepo.GetAllAsync(ct);
        var projects = await projectRepo.GetAllAsync(ct);
        var (total, done) = await taskStatsRepo.GetTotalAndDoneCountAsync(ct);
        var subscriptions = await subscriptionRepo.GetAllAsync(ct);
        var payments = await paymentRepo.GetAllAsync(ct);

        var activeSubscriptions = subscriptions.Count(s => s.IsCurrentlyActive);
        var revenueCents = payments
            .Where(p => p.Status == PaymentTransactionStatus.Succeeded)
            .Sum(p => (long)p.AmountCents);

        return new PlatformStatsDto(
            Users: users.Count,
            ActiveUsers: users.Count(u => (u.Status ?? UserStatus.Active) == UserStatus.Active && u.DeletedAt is null),
            Organizations: orgs.Count,
            Projects: projects.Count,
            ActiveSubscriptions: activeSubscriptions,
            RevenueCents: revenueCents,
            Tasks: total,
            TasksDone: done
        );
    }
}
