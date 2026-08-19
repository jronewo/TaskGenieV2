using TaskGenie.Application.Features.Auth.DTOs;
using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Interfaces;

public interface IAuthTokenIssuer
{
    Task<AuthResponse> IssueAsync(User user, string message, CancellationToken ct = default);
}
