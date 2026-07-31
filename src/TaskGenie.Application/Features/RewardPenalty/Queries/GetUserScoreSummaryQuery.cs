using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.RewardPenalty.Queries;

public record GetUserScoreSummaryQuery(int UserId) : IRequest<UserScoreSummaryDto>;

public class GetUserScoreSummaryQueryHandler(
    IUserScoreRepository userScoreRepo,
    IUserRepository userRepo)
    : IRequestHandler<GetUserScoreSummaryQuery, UserScoreSummaryDto>
{
    public async Task<UserScoreSummaryDto> Handle(GetUserScoreSummaryQuery request, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        var scores = await userScoreRepo.GetByUserIdAsync(request.UserId, ct);

        int totalScore = scores.Sum(s => s.Amount);
        int totalReward = scores.Where(s => s.Type == "REWARD").Sum(s => s.Amount);
        int totalPenalty = scores.Where(s => s.Type == "PENALTY").Sum(s => s.Amount);

        var (level, min, max, progress) = ScoreLevelHelper.GetLevel(totalScore);

        return new UserScoreSummaryDto
        {
            UserId = user.UserId,
            UserName = user.Name,
            Avatar = user.Avatar,
            TotalScore = totalScore,
            TotalRewardPoints = totalReward,
            TotalPenaltyPoints = totalPenalty,
            Level = level,
            LevelMinScore = min == int.MinValue ? 0 : min,
            LevelMaxScore = max == int.MaxValue ? 9999 : max,
            ProgressToNextLevel = progress
        };
    }
}
