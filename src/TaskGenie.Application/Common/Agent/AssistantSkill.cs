using System.Text.RegularExpressions;
using MediatR;

namespace TaskGenie.Application.Common.Agent;

/// <summary>What a skill can reach. The actor is fixed here, never parsed out of the message.</summary>
public sealed record SkillContext(IMediator Mediator, int CurrentUserId, int? ProjectId);

/// <summary>Values pulled out of the user's sentence by the skill's own pattern.</summary>
public sealed class SkillArgs(Match match)
{
    public string? Text(string group) =>
        match.Groups[group].Success ? match.Groups[group].Value.Trim() : null;

    public int? Number(string group) =>
        match.Groups[group].Success && int.TryParse(match.Groups[group].Value, out var value) ? value : null;
}

/// <summary>
/// One thing the assistant can do, declared rather than inferred.
///
/// Each skill states the sentences that trigger it and the use cases it invokes, so "what can this
/// bot do and what will it touch" is answerable by reading this list instead of tracing a model's
/// behaviour. <see cref="ApiCalls"/> is documentation for humans; the behaviour is in
/// <see cref="Execute"/>, and both are kept honest by tests.
/// </summary>
public sealed record AssistantSkill(
    string Id,
    string Title,
    /// <summary>Shown to the user when listing what the assistant can do.</summary>
    string Example,
    /// <summary>The application use cases this skill sends. Documentation, not enforcement.</summary>
    string[] ApiCalls,
    /// <summary>True when the skill changes data.</summary>
    bool Mutates,
    /// <summary>Ordered patterns; the first that matches wins and supplies the arguments.</summary>
    Regex[] Patterns,
    Func<SkillArgs, SkillContext, CancellationToken, System.Threading.Tasks.Task<string>> Execute)
{
    /// <summary>Returns the extracted arguments when this skill claims the message.</summary>
    public SkillArgs? TryMatch(string message)
    {
        foreach (var pattern in Patterns)
        {
            var match = pattern.Match(message);
            if (match.Success) return new SkillArgs(match);
        }
        return null;
    }
}
