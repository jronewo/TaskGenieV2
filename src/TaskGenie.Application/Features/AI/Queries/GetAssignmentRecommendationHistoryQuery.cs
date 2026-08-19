using MediatR;
using TaskGenie.Application.Features.AI.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Queries;

public sealed record GetAssignmentRecommendationHistoryQuery(int TaskId) : IRequest<List<AssignmentRecommendationHistoryDto>>;

public sealed class GetAssignmentRecommendationHistoryQueryHandler(
    IResourceAuthorizationService authz,
    IAiRecommendationRepository repository)
    : IRequestHandler<GetAssignmentRecommendationHistoryQuery, List<AssignmentRecommendationHistoryDto>>
{
    public async Task<List<AssignmentRecommendationHistoryDto>> Handle(GetAssignmentRecommendationHistoryQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(query.TaskId, ct);

        var recommendations = await repository.GetByTaskIdAsync(query.TaskId, ct);
        return recommendations.Select(recommendation => new AssignmentRecommendationHistoryDto
        {
            Id = recommendation.Id,
            RunId = recommendation.RunId,
            TaskId = recommendation.TaskId ?? 0,
            UserId = recommendation.SuggestedUserId ?? 0,
            UserName = recommendation.SuggestedUser?.Name ?? string.Empty,
            Rank = recommendation.Rank,
            Score = recommendation.Score ?? 0,
            SkillMatchScore = recommendation.SkillMatchScore,
            SemanticSimilarityScore = recommendation.SemanticSimilarityScore,
            WorkloadScore = recommendation.WorkloadScore,
            PerformanceScore = recommendation.PerformanceScore,
            Reason = recommendation.Reason ?? string.Empty,
            Status = recommendation.Status,
            DecidedBy = recommendation.DecidedBy,
            DecidedAt = recommendation.DecidedAt,
            Outcome = recommendation.Outcome,
            ModelVersion = recommendation.ModelVersion,
            CreatedAt = recommendation.CreatedAt
        }).ToList();
    }
}
