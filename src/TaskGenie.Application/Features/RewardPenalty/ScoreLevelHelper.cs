namespace TaskGenie.Application.Features.RewardPenalty;

public static class ScoreLevelHelper
{
    private static readonly (string Name, int Min, int Max)[] Levels =
    [
        ("Rookie",   int.MinValue, -1),
        ("Bronze",   0,            99),
        ("Silver",   100,          299),
        ("Gold",     300,          699),
        ("Platinum", 700,          1499),
        ("Diamond",  1500,         int.MaxValue),
    ];

    public static (string Level, int Min, int Max, int ProgressPercent) GetLevel(int totalScore)
    {
        foreach (var (name, min, max) in Levels)
        {
            if (totalScore >= min && totalScore <= max)
            {
                int progress = max == int.MaxValue
                    ? 100
                    : (int)((double)(totalScore - min) / (max - min + 1) * 100);
                return (name, min, max, Math.Clamp(progress, 0, 100));
            }
        }
        return ("Rookie", int.MinValue, -1, 0);
    }

    // Base reward for completing a task = difficulty * 10 (default 20 if no difficulty)
    public static int BaseReward(int? difficulty) => (difficulty ?? 2) * 10;

    // Extra % bonus for finishing early: capped at 50%
    public static int EarlyBonus(int? difficulty, int daysEarly, int totalDays)
    {
        if (daysEarly <= 0 || totalDays <= 0) return BaseReward(difficulty);
        double earlyPercent = Math.Min(50.0, (double)daysEarly / totalDays * 100.0);
        int bonus = (int)(BaseReward(difficulty) * earlyPercent / 100.0);
        return BaseReward(difficulty) + bonus;
    }

    // Penalty per day late
    public static int PenaltyPerDayLate => 5;
}
