using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Organizations.DTOs;

public sealed class OrganizationDto
{
    public int OrganizationId { get; init; }
    public string Name { get; init; } = null!;
    public string? Description { get; init; }
    public string? Logo { get; init; }
    public int? OwnerId { get; init; }
    public string? OwnerName { get; init; }
    public DateTime? CreatedAt { get; init; }

    public static OrganizationDto FromEntity(Organization o) => new()
    {
        OrganizationId = o.OrganizationId,
        Name = o.Name,
        Description = o.Description,
        Logo = o.Logo,
        OwnerId = o.OwnerId,
        OwnerName = o.Owner?.Name,
        CreatedAt = o.CreatedAt
    };
}
