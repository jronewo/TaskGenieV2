using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Admin.DTOs;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Admin.Queries;

public sealed record GetAdminUserByIdQuery(int UserId) : IRequest<AdminUserDto>;

public sealed class GetAdminUserByIdQueryHandler(IUserRepository userRepo)
    : IRequestHandler<GetAdminUserByIdQuery, AdminUserDto>
{
    public async Task<AdminUserDto> Handle(GetAdminUserByIdQuery query, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(query.UserId, ct)
            ?? throw new NotFoundException("User", query.UserId);

        return AdminUserDto.FromEntity(user);
    }
}
