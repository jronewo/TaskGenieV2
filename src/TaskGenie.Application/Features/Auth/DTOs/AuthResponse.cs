namespace TaskGenie.Application.Features.Auth.DTOs;

public record AuthResponse(
    int UserId,
    string? Name,
    string? Email,
    string Role,
    bool IsFirstLogin,
    bool IsOrgOwner,
    string Message = "");
