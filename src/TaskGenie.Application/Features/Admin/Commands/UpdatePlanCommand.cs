using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

/// <summary>Full-replace update of a plan's editable fields (Code and Scope are immutable
/// after creation to avoid unique-conflict/re-scoping edge cases).</summary>
public sealed record UpdatePlanCommand(
    int PlanId,
    string Name,
    int PriceCents,
    int BillingPeriodDays,
    int? ProjectLimit,
    string? Features
) : IRequest<PlanDto>;

public sealed class UpdatePlanCommandHandler(IPlanRepository planRepo)
    : IRequestHandler<UpdatePlanCommand, PlanDto>
{
    public async Task<PlanDto> Handle(UpdatePlanCommand cmd, CancellationToken ct)
    {
        var plan = await planRepo.GetByIdAsync(cmd.PlanId, ct)
            ?? throw new NotFoundException("Plan", cmd.PlanId);

        if (cmd.PriceCents < 0)
            throw new InvalidOperationException("Price cannot be negative.");
        if (cmd.BillingPeriodDays <= 0)
            throw new InvalidOperationException("Billing period must be at least 1 day.");
        if (cmd.ProjectLimit is < 0)
            throw new InvalidOperationException("Project limit cannot be negative.");

        plan.Update(cmd.Name, cmd.PriceCents, cmd.BillingPeriodDays, cmd.ProjectLimit, cmd.Features);
        await planRepo.UpdateAsync(plan, ct);

        return PlanDto.FromEntity(plan);
    }
}
