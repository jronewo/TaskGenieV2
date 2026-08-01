using MediatR;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Subscriptions.Queries;

/// <summary>Scope is optional: "Personal", "Organization", or null for both.</summary>
public sealed record GetActivePlansQuery(string? Scope) : IRequest<List<PlanDto>>;

public sealed class GetActivePlansQueryHandler(IPlanRepository planRepo)
    : IRequestHandler<GetActivePlansQuery, List<PlanDto>>
{
    public async Task<List<PlanDto>> Handle(GetActivePlansQuery query, CancellationToken ct)
    {
        var plans = await planRepo.GetActiveAsync(query.Scope, ct);
        return plans.Select(PlanDto.FromEntity).ToList();
    }
}
