using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.RewardPenalty.Queries;

public record GetProjectScoreLeaderboardQuery(int ProjectId) : IRequest<ProjectScoreLeaderboardDto>;

public class GetProjectScoreLeaderboardQueryHandler(
    IProjectRepository projectRepo,
    IUserScoreRepository userScoreRepo)
    : IRequestHandler<GetProjectScoreLeaderboardQuery, ProjectScoreLeaderboardDto>
{
    public async Task<ProjectScoreLeaderboardDto> Handle(GetProjectScoreLeaderboardQuery request, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(request.ProjectId, ct)
            ?? throw new NotFoundException("Project", request.ProjectId);

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
