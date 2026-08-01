using MediatR;
using TaskGenie.Application.Features.Subscriptions.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

/// <summary>All plans including inactive ones — unlike the public GetActivePlansQuery, this is
/// for the admin plan-management screen.</summary>
public sealed record GetAdminPlansQuery : IRequest<List<PlanDto>>;

public sealed class GetAdminPlansQueryHandler(IPlanRepository planRepo)
    : IRequestHandler<GetAdminPlansQuery, List<PlanDto>>
{
    public async Task<List<PlanDto>> Handle(GetAdminPlansQuery query, CancellationToken ct)
    {
        var plans = await planRepo.GetAllAsync(ct);
        return plans.Select(PlanDto.FromEntity).ToList();
    }
}
