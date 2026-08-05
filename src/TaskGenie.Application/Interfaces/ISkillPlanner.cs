namespace TaskGenie.Application.Interfaces;

/// <summary>
/// The skill the planner chose, and the arguments it read out of the sentence.
///
/// <paramref name="SkillId"/> is only ever a value the caller offered — a planner cannot invent a
/// capability, so a wrong answer is a wrong choice among known skills, never a new action.
/// </summary>
public sealed record SkillPlan(string SkillId, IReadOnlyDictionary<string, string> Arguments);

/// <summary>
/// Works out which assistant skill a free-form sentence is asking for.
///
/// This exists because the assistant's patterns only recognise sentences shaped the way they were
/// written: "tạo task tên là X" matches, "thêm việc X cho tôi đi" does not, though both plainly ask
/// for the same thing. A planner reads intent instead of shape.
///
/// It decides *what was asked*, never *what happens next*: the caller looks the id up in its own
/// registry and runs that skill through the usual use case, so authorization is unchanged.
/// </summary>
public interface ISkillPlanner
{
    /// <summary>
    /// Returns the chosen skill, or null when the sentence matches nothing on offer.
    /// </summary>
    /// <param name="message">What the user typed.</param>
    /// <param name="candidates">The skills the caller is willing to run, in its own words.</param>
    Task<SkillPlan?> PlanAsync(
        string message,
        IReadOnlyList<PlannerSkill> candidates,
        CancellationToken ct = default);
}

/// <summary>
/// One skill as described to the planner: what it does and what it needs to know.
/// </summary>
/// <param name="Arguments">
/// Argument name to a short description. Kept as plain text because the planner is told these
/// verbatim, and a description that reads well to a person reads well to a model.
/// </param>
public sealed record PlannerSkill(
    string Id,
    string Description,
    IReadOnlyDictionary<string, string> Arguments,
    bool Mutates);
