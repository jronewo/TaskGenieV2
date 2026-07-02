using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.RewardPenalty.Queries;

public record GetUserScoreHistoryQuery(int UserId) : IRequest<List<UserScoreDto>>;

public class GetUserScoreHistoryQueryHandler(IUserScoreRepository userScoreRepo)
    : IRequestHandler<GetUserScoreHistoryQuery, List<UserScoreDto>>
{
    public async Task<List<UserScoreDto>> Handle(GetUserScoreHistoryQuery request, CancellationToken ct)
    {
        var scores = await userScoreRepo.GetByUserIdAsync(request.UserId, ct);

        return scores.Select(s => new UserScoreDto
        {
            Id = s.Id,
            UserId = s.UserId,
            UserName = s.User?.Name,
            TaskId = s.TaskId,
            TaskTitle = s.Task?.Title,
            ProjectId = s.ProjectId,
            ProjectName = s.Project?.Name,
            Type = s.Type,
            Amount = s.Amount,
            Reason = s.Reason,
            CreatedAt = s.CreatedAt
        }).ToList();
    }
}
