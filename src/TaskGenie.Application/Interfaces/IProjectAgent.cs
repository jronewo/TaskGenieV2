namespace TaskGenie.Application.Interfaces;

/// <summary>A step the agent took, so the UI can show its work rather than a bare answer.</summary>
public sealed record AgentStep(string Tool, string Arguments, string Result);

public sealed record AgentReply(string Answer, IReadOnlyList<AgentStep> Steps);

/// <summary>
/// A conversational agent that can read and change the caller's projects by calling the system's
/// own use cases.
///
/// Every tool it can reach runs through MediatR under the signed-in user's identity, so the agent
/// is bounded by exactly the same authorization as that person clicking in the UI. It has no
/// service account and no elevated path — a project the user cannot see is a project the agent
/// cannot see.
/// </summary>
public interface IProjectAgent
{
    System.Threading.Tasks.Task<AgentReply> RunAsync(
        string userMessage,
        int? projectId,
        CancellationToken ct = default);
}
