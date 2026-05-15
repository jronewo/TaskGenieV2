using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Users.Commands;

public class ChangePasswordCommandHandler(IUserRepository userRepository, IPasswordHasher passwordHasher)
    : IRequestHandler<ChangePasswordCommand, bool>
{
    public async Task<bool> Handle(ChangePasswordCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        if (!passwordHasher.Verify(request.CurrentPassword, user.Password ?? ""))
            throw new UnauthorizedAccessException("Mật khẩu hiện tại không đúng.");

        user.ChangePassword(passwordHasher.Hash(request.NewPassword));
        await userRepository.UpdateUserAsync(user, ct);
        return true;
    }
}
