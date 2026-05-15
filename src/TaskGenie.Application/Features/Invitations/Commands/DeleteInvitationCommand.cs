using MediatR;

namespace TaskGenie.Application.Features.Invitations.Commands;

public record DeleteInvitationCommand(int InvitationId) : IRequest<bool>;
