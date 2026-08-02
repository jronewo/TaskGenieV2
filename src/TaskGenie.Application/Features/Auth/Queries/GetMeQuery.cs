using MediatR;

namespace TaskGenie.Application.Features.Auth.Queries;

public record GetMeQuery : IRequest<MeResponse>;

public record MeResponse(
    int UserId,
    string Name,
    string Email,
    string Role,
    string? Avatar,
    bool IsOrgOwner,
    DateTime? CreatedAt);
