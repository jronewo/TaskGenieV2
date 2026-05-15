using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Users;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Users.Queries;

public class SearchUserByEmailQueryHandler(IUserRepository userRepository)
    : IRequestHandler<SearchUserByEmailQuery, UserSearchDto>
{
    public async Task<UserSearchDto> Handle(SearchUserByEmailQuery request, CancellationToken ct)
    {
        var user = await userRepository.GetByEmailAsync(request.Email, ct)
            ?? throw new NotFoundException("User", request.Email);

        return new UserSearchDto
        {
            UserId = user.UserId,
            Name = user.Name ?? "No Name",
            Email = user.Email ?? string.Empty,
            Avatar = user.Avatar
        };
    }
}
