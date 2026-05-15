using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Users;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Users.Commands;

public class UpdateUserProfileCommandHandler(IUserRepository userRepository)
    : IRequestHandler<UpdateUserProfileCommand, UserProfileDto>
{
    public async Task<UserProfileDto> Handle(UpdateUserProfileCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        user.UpdateProfile(request.Name, request.Avatar);
        await userRepository.UpdateUserAsync(user, ct);

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
