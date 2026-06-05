using MediatR;

namespace TaskGenie.Application.Features.Auth.Commands;

public record LogoutCommand(string Jti, DateTime ExpiresAtUtc) : IRequest<bool>;
