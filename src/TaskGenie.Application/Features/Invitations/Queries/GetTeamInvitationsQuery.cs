using MediatR;
using TaskGenie.Application.Features.Invitations;

namespace TaskGenie.Application.Features.Invitations.Queries;

public record GetTeamInvitationsQuery(int TeamId) : IRequest<List<InvitationDto>>;
