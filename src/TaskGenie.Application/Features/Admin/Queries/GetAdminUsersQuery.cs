using MediatR;
using TaskGenie.Application.Common.Models;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

public sealed record GetAdminUsersQuery(int Page = 1, int PageSize = 20, string? Search = null)
    : IRequest<PagedResult<AdminUserDto>>;

public sealed class GetAdminUsersQueryHandler(IUserRepository userRepo)
    : IRequestHandler<GetAdminUsersQuery, PagedResult<AdminUserDto>>
{
    public async Task<PagedResult<AdminUserDto>> Handle(GetAdminUsersQuery query, CancellationToken ct)
    {
        var users = await userRepo.GetAllAsync(ct);

        IEnumerable<Domain.Entities.User> filtered = users;
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            filtered = filtered.Where(u =>
                (u.Name?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (u.Email?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        var ordered = filtered.OrderByDescending(u => u.CreatedAt).Select(AdminUserDto.FromEntity);
        return PagedResult<AdminUserDto>.Create(ordered, query.Page, query.PageSize);
    }
}
