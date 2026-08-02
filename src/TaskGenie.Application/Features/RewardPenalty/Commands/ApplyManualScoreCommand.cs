using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
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
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IUserScoreRepository userScoreRepo,
    IUserRepository userRepo)
    : IRequestHandler<ApplyManualScoreCommand, UserScoreDto>
{
    public async Task<UserScoreDto> Handle(ApplyManualScoreCommand request, CancellationToken ct)
    {
        // Granting reward/penalty points is a leader action, never the recipient's. Without this,
        // any authenticated user could award themselves unlimited points by posting their own
        // UserId. Project-scoped scores need manage rights on that project; an unscoped
        // (platform-wide) score is PLATFORM_ADMIN only.
        if (request.ProjectId is int projectId)
            await authorization.EnsureCanManageTasksInProjectAsync(projectId, ct);
        else if (!currentUser.IsPlatformAdmin)
            throw new ForbiddenException("Only a platform administrator can apply a score outside a project.");

        // A project leader must not quietly award points to themselves either.
        if (request.UserId == currentUser.UserId && !currentUser.IsPlatformAdmin)
            throw new ForbiddenException("You cannot apply a manual score to yourself.");

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
