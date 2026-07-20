using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Auth.Commands;

public class LogoutCommandHandler(ITokenRevocationService tokenRevocationService)
    : IRequestHandler<LogoutCommand, bool>
{
    public Task<bool> Handle(LogoutCommand request, CancellationToken ct)
    {
        tokenRevocationService.Revoke(request.Jti, request.ExpiresAtUtc);
        return Task.FromResult(true);
    }
}
