using MediatR;
using TaskGenie.Application.Features.Invitations;

namespace TaskGenie.Application.Features.Invitations.Commands;

public record CreateInvitationCommand(int TeamId, string Email) : IRequest<InvitationDto>;
