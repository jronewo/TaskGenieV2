using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.RewardPenalty.Queries;

public record GetProjectScoreLeaderboardQuery(int ProjectId) : IRequest<ProjectScoreLeaderboardDto>;

public class GetProjectScoreLeaderboardQueryHandler(
    IResourceAuthorizationService authorization,
    IUserScoreRepository userScoreRepo)
    : IRequestHandler<GetProjectScoreLeaderboardQuery, ProjectScoreLeaderboardDto>
{
    public async Task<ProjectScoreLeaderboardDto> Handle(GetProjectScoreLeaderboardQuery request, CancellationToken ct)
    {
        // A leaderboard exposes every member's standing — restrict it to people with access to
        // the project itself.
        var project = await authorization.EnsureCanAccessProjectAsync(request.ProjectId, ct);

        var projectScores = await userScoreRepo.GetByProjectIdAsync(request.ProjectId, ct);

        // Group by user
        var grouped = projectScores
            .GroupBy(s => s.UserId)
            .Select(g =>
            {
                var firstEntry = g.First();
                int total = g.Sum(s => s.Amount);
                int reward = g.Where(s => s.Type == "REWARD").Sum(s => s.Amount);
                int penalty = g.Where(s => s.Type == "PENALTY").Sum(s => s.Amount);
                var (level, min, max, progress) = ScoreLevelHelper.GetLevel(total);

                return new UserScoreSummaryDto
                {
                    UserId = g.Key,
                    UserName = firstEntry.User?.Name,
                    Avatar = firstEntry.User?.Avatar,
                    TotalScore = total,
                    TotalRewardPoints = reward,
                    TotalPenaltyPoints = penalty,
                    Level = level,
                    LevelMinScore = min == int.MinValue ? 0 : min,
                    LevelMaxScore = max == int.MaxValue ? 9999 : max,
                    ProgressToNextLevel = progress
                };
            })
            .OrderByDescending(u => u.TotalScore)
            .ToList();

        return new ProjectScoreLeaderboardDto
        {
            ProjectId = request.ProjectId,
            ProjectName = project.Name,
            Members = grouped
        };
    }
}
