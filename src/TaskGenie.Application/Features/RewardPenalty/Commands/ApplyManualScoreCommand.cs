using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.RewardPenalty.Commands;

public record ApplyManualScoreCommand(
    int UserId,
    string Type,        // "REWARD" | "PENALTY"
    int Amount,
    string Reason,
    int? TaskId = null,
    int? ProjectId = null) : IRequest<UserScoreDto>;

public class ApplyManualScoreCommandHandler(
    IUserScoreRepository userScoreRepo,
    IUserRepository userRepo)
    : IRequestHandler<ApplyManualScoreCommand, UserScoreDto>
{
    public async Task<UserScoreDto> Handle(ApplyManualScoreCommand request, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        var type = request.Type.ToUpperInvariant();
        if (type != "REWARD" && type != "PENALTY")
            throw new InvalidOperationException("Type must be 'REWARD' or 'PENALTY'.");

        UserScore score = type == "REWARD"
            ? UserScore.CreateReward(request.UserId, request.Amount, request.Reason, request.TaskId, request.ProjectId)
            : UserScore.CreatePenalty(request.UserId, request.Amount, request.Reason, request.TaskId, request.ProjectId);

        await userScoreRepo.AddAsync(score, ct);

        return new UserScoreDto
        {
            Id = score.Id,
            UserId = score.UserId,
            UserName = user.Name,
            TaskId = score.TaskId,
            ProjectId = score.ProjectId,
            Type = score.Type,
            Amount = score.Amount,
            Reason = score.Reason,
            CreatedAt = score.CreatedAt
        };
    }
}
