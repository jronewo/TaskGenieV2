using MediatR;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

public sealed record CreatePlanCommand(
    string Code,
    string Name,
    string Scope,
    int PriceCents,
    int BillingPeriodDays,
    int? ProjectLimit,
    string? Features,
    bool IsActive
) : IRequest<PlanDto>;

public sealed class CreatePlanCommandHandler(IPlanRepository planRepo)
    : IRequestHandler<CreatePlanCommand, PlanDto>
{
    private static readonly HashSet<string> ValidScopes = new(StringComparer.Ordinal) { "Personal", "Organization" };

    public async Task<PlanDto> Handle(CreatePlanCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Code))
            throw new InvalidOperationException("Plan code is required.");
        if (!ValidScopes.Contains(cmd.Scope))
            throw new InvalidOperationException("Scope must be 'Personal' or 'Organization'.");
        if (cmd.PriceCents < 0)
            throw new InvalidOperationException("Price cannot be negative.");
        if (cmd.BillingPeriodDays <= 0)
            throw new InvalidOperationException("Billing period must be at least 1 day.");
        if (cmd.ProjectLimit is < 0)
            throw new InvalidOperationException("Project limit cannot be negative.");

        var code = cmd.Code.Trim().ToUpperInvariant();
        var existing = await planRepo.GetByCodeAsync(code, ct);
        if (existing is not null)
            throw new InvalidOperationException($"A plan with code '{code}' already exists.");

        var plan = Plan.Create(code, cmd.Name, cmd.Scope, cmd.PriceCents, cmd.BillingPeriodDays, cmd.ProjectLimit, cmd.Features, cmd.IsActive);
        await planRepo.AddAsync(plan, ct);

        return PlanDto.FromEntity(plan);
    }
}
