namespace TaskGenie.Application.Features.Organizations.DTOs;

/// <summary>An organization the current user belongs to, with their role in it.</summary>
public sealed class MyOrganizationDto
{
    public OrganizationDto Organization { get; init; } = null!;
    public string Role { get; init; } = null!;
}
