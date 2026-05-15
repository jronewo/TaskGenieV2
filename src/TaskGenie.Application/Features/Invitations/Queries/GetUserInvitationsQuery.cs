using MediatR;
using TaskGenie.Application.Features.Invitations;

namespace TaskGenie.Application.Features.Invitations.Queries;

public record GetUserInvitationsQuery(string Email) : IRequest<List<InvitationDto>>;
