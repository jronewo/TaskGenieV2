using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Users;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Users.Queries;

public class GetUserByIdQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetUserByIdQuery, UserProfileDto>
{
    public async Task<UserProfileDto> Handle(GetUserByIdQuery request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        return new UserProfileDto
        {
            UserId = user.UserId,
            Name = user.Name,
            Email = user.Email,
            Avatar = user.Avatar,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        };
    }
}
