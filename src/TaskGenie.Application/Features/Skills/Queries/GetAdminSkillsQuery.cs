using MediatR;
using TaskGenie.Application.Common.Models;
using TaskGenie.Application.Features.Skills;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Skills.Queries;

/// <summary>Admin skill-catalog listing: paginated, searchable, includes inactive skills —
/// unlike GetAllSkillsQuery which hides inactive skills from non-admin catalog browsing.</summary>
public sealed record GetAdminSkillsQuery(int Page = 1, int PageSize = 20, string? Search = null, bool? ActiveOnly = null)
    : IRequest<PagedResult<SkillDto>>;

public sealed class GetAdminSkillsQueryHandler(ISkillRepository skillRepository)
    : IRequestHandler<GetAdminSkillsQuery, PagedResult<SkillDto>>
{
    public async Task<PagedResult<SkillDto>> Handle(GetAdminSkillsQuery request, CancellationToken ct)
    {
        var skills = await skillRepository.GetAllAsync(ct);

        IEnumerable<Domain.Entities.Skill> filtered = skills;
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            filtered = filtered.Where(s => (s.SkillName ?? "").Contains(term, StringComparison.OrdinalIgnoreCase));
        }
        if (request.ActiveOnly is bool activeOnly)
            filtered = filtered.Where(s => s.IsActive == activeOnly);

        var dtos = filtered
            .OrderBy(s => s.SkillName)
            .Select(s => new SkillDto { SkillId = s.SkillId, SkillName = s.SkillName ?? "Unknown Skill", IsActive = s.IsActive });

        return PagedResult<SkillDto>.Create(dtos, request.Page, request.PageSize);
    }
}
