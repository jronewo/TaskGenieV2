using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Invitations;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Invitations.Commands;

public class CreateInvitationCommandHandler(IInvitationRepository invitationRepository)
    : IRequestHandler<CreateInvitationCommand, InvitationDto>
{
    public async Task<InvitationDto> Handle(CreateInvitationCommand request, CancellationToken ct)
    {
        var invitation = Invitation.Create(request.TeamId, request.Email);
        await invitationRepository.AddAsync(invitation, ct);

        var created = await invitationRepository.GetByIdAsync(invitation.InvitationId, ct)
            ?? throw new NotFoundException(nameof(Invitation), invitation.InvitationId);

        return new InvitationDto
        {
            InvitationId = created.InvitationId,
            TeamId = created.TeamId,
            TeamName = created.Team?.Name,
            Email = created.Email,
            Status = created.Status
        };
    }
}
