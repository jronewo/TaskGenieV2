using MediatR;
using TaskGenie.Application.Events;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.RewardPenalty.EventHandlers;

// Automatically awards reward or applies penalty when a task is marked Done.
//
// Reward logic (task has deadline):
//   base = difficulty * 10  (default 20 when difficulty is null)
//   if completed before deadline:
//     earlyPercent = min(50, daysEarly / totalDays * 100)
//     reward = base + base * earlyPercent / 100
//   if completed on deadline: reward = base
//
// Penalty logic (completed after deadline):
//   penalty = 5 points per day late (stored as negative)
//
// Tasks without a deadline get the base reward only.
public class TaskCompletedScoreHandler(
    ITaskRepository taskRepo,
    IUserScoreRepository userScoreRepo)
    : INotificationHandler<TaskCompletedEvent>
{
    public async System.Threading.Tasks.Task Handle(TaskCompletedEvent notification, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdWithDetailsAsync(notification.TaskId, ct);
        if (task is null) return;

        var assignees = task.TaskAssignees
            .Where(a => a.UserId.HasValue)
            .Select(a => a.UserId!.Value)
            .ToList();
        if (assignees.Count == 0) return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        int baseReward = ScoreLevelHelper.BaseReward(task.Difficulty);

        foreach (int userId in assignees)
        {
            UserScore score;

            if (task.Deadline.HasValue)
            {
                int daysLate = today.DayNumber - task.Deadline.Value.DayNumber;

                if (daysLate > 0)
                {
                    // Late — penalty only
                    int penaltyAmount = daysLate * ScoreLevelHelper.PenaltyPerDayLate;
                    score = UserScore.CreatePenalty(
                        userId,
                        penaltyAmount,
                        $"Task '{task.Title}' completed {daysLate} day(s) past deadline.",
                        task.TaskId,
                        task.ProjectId);
                }
                else
                {
                    // On time or early
                    int daysEarly = -daysLate; // positive
                    int taskDuration = task.CreatedAt.HasValue && task.Deadline.HasValue
                        ? Math.Max(1, task.Deadline.Value.DayNumber - DateOnly.FromDateTime(task.CreatedAt.Value).DayNumber)
                        : 7;

                    int rewardAmount = ScoreLevelHelper.EarlyBonus(task.Difficulty, daysEarly, taskDuration);
                    string reason = daysEarly > 0
                        ? $"Task '{task.Title}' completed {daysEarly} day(s) early (+{Math.Min(50, daysEarly * 100 / taskDuration)}% bonus)."
                        : $"Task '{task.Title}' completed on time.";

                    score = UserScore.CreateReward(userId, rewardAmount, reason, task.TaskId, task.ProjectId);
                }
            }
            else
            {
                // No deadline — base reward
                score = UserScore.CreateReward(
                    userId,
                    baseReward,
                    $"Task '{task.Title}' completed.",
                    task.TaskId,
                    task.ProjectId);
            }

            await userScoreRepo.AddAsync(score, ct);
        }
    }
}
