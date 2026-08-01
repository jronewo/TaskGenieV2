using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Commands;

/// <summary>Activates or deactivates a plan. Plans are never hard-deleted — a plan already
/// referenced by existing subscriptions must remain resolvable (for history/entitlement
/// lookups), so deactivation (blocking new subscriptions) is the only "removal" available.</summary>
public sealed record SetPlanActiveCommand(int PlanId, bool IsActive) : IRequest<PlanDto>;

public sealed class SetPlanActiveCommandHandler(IPlanRepository planRepo)
    : IRequestHandler<SetPlanActiveCommand, PlanDto>
{
    public async Task<PlanDto> Handle(SetPlanActiveCommand cmd, CancellationToken ct)
    {
        var plan = await planRepo.GetByIdAsync(cmd.PlanId, ct)
            ?? throw new NotFoundException("Plan", cmd.PlanId);

        if (cmd.IsActive) plan.Activate();
        else plan.Deactivate();

        await planRepo.UpdateAsync(plan, ct);
        return PlanDto.FromEntity(plan);
    }
}
