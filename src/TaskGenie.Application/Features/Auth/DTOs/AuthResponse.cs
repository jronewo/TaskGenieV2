namespace TaskGenie.Application.Features.Auth.DTOs;

public record AuthResponse(
    int UserId,
    string? Name,
    string? Email,
    string Role,
    /// <summary>Without this the signed-in user has no picture until something calls /auth/me,
    /// which is why every avatar in the shell fell back to initials.</summary>
    string? Avatar,
    bool IsFirstLogin,
    bool IsOrgOwner,
    string AccessToken,
    DateTime ExpiresAtUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresAtUtc,
    string Message = "");
