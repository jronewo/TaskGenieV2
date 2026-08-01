using TaskGenie.Application.Features.Organizations.DTOs;

namespace TaskGenie.Application.Features.Admin.DTOs;

public sealed class AdminOrganizationDetailDto
{
    public AdminOrganizationDto Summary { get; init; } = null!;
    public List<OrganizationMemberDto> Members { get; init; } = new();
}
