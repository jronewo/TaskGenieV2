using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Auth.Commands;

public class LogoutCommandHandler(
    ITokenRevocationService tokenRevocationService,
    IRefreshTokenService refreshTokenService)
    : IRequestHandler<LogoutCommand, bool>
{
    public async Task<bool> Handle(LogoutCommand request, CancellationToken ct)
    {
        tokenRevocationService.Revoke(request.Jti, request.ExpiresAtUtc);

        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
            await refreshTokenService.RevokeAsync(request.RefreshToken, ct);

        return true;
    }
}
