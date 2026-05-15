using MediatR;
using TaskGenie.Application.Features.Invitations;

namespace TaskGenie.Application.Features.Invitations.Queries;

public record GetInvitationByIdQuery(int InvitationId) : IRequest<InvitationDto?>;
