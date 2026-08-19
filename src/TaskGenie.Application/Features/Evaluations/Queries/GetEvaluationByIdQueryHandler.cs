using MediatR;
using TaskGenie.Application.Features.Evaluations;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evaluations.Queries;

public class GetEvaluationByIdQueryHandler(
    ICurrentUser currentUser,
    IEvaluationRepository evaluationRepository)
    : IRequestHandler<GetEvaluationByIdQuery, EvaluationDto?>
{
    public async Task<EvaluationDto?> Handle(GetEvaluationByIdQuery request, CancellationToken ct)
    {
        var e = await evaluationRepository.GetByIdAsync(request.EvaluationId, ct);
        if (e == null) return null;

        // A performance review is visible to its subject and to the leader who wrote it only.
        var isSubject = e.UserId == currentUser.UserId;
        var isAuthor = e.LeaderId == currentUser.UserId;
        if (!isSubject && !isAuthor && !currentUser.IsPlatformAdmin) return null;

        return MapToDto(e);
    }

    private static EvaluationDto MapToDto(TaskGenie.Domain.Entities.Evaluation e) => new()
    {
        EvaluationId = e.EvaluationId,
        UserId = e.UserId ?? 0,
        UserName = e.User?.Name,
        LeaderId = e.LeaderId,
        LeaderName = e.Leader?.Name,
        SkillScore = e.SkillScore,
        TeamworkScore = e.TeamworkScore,
        DeadlineScore = e.DeadlineScore,
        CommunicationScore = e.CommunicationScore,
        CreatedAt = e.CreatedAt
    };
}
