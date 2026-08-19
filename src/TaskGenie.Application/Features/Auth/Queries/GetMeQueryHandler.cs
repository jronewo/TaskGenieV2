using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Auth.Queries;

public class GetMeQueryHandler(
    ICurrentUser currentUser,
    IUserRepository userRepository,
    IOrganizationRepository organizationRepository)
    : IRequestHandler<GetMeQuery, MeResponse>
{
    public async Task<MeResponse> Handle(GetMeQuery request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(currentUser.UserId, ct)
            ?? throw new UnauthorizedAccessException("User no longer exists.");

        var isOrgOwner = await organizationRepository.GetByOwnerIdAsync(user.UserId, ct) != null;

        return new MeResponse(
            user.UserId,
            user.Name,
            user.Email,
            user.Role ?? "NORMAL_USER",
            user.Avatar,
            isOrgOwner,
            user.CreatedAt);
    }
}
