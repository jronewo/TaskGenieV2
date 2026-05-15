using MediatR;

namespace TaskGenie.Application.Features.Invitations.Commands;

public record UpdateInvitationStatusCommand(int InvitationId, string Status) : IRequest<bool>;
