using FluentValidation;
using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.AI.Queries;

/// <summary>
/// A message for the project agent. Optionally scoped to the board the user has open, which only
/// helps the model resolve "this project" — it grants no access of its own.
/// </summary>
public sealed record RunAgentQuery(string Message, int? ProjectId) : IRequest<AgentReply>;

public sealed class RunAgentQueryValidator : AbstractValidator<RunAgentQuery>
{
    /// <summary>Matches the composer's own limit so the two agree on one number.</summary>
    public const int MaxPromptLength = 500;

    public RunAgentQueryValidator()
    {
        RuleFor(q => q.Message)
            .NotEmpty().WithMessage("Ask something first.")
            .MaximumLength(MaxPromptLength)
            .WithMessage($"Keep the message under {MaxPromptLength} characters.");
    }
}

/// <summary>
/// Runs the agent for the caller's own work. The agent belongs to whichever plans an admin marked
/// as including it — not to "any paid plan". Hiding the launcher in the UI is presentation only;
/// this handler is what actually has to refuse a caller whose plan does not carry the feature,
/// since the agent can create/assign/complete work and must never be reachable by bypassing the UI.
/// </summary>
public sealed class RunAgentQueryHandler(
    ICurrentUser currentUser,
    IEntitlementService entitlements,
    IProjectAgent agent
) : IRequestHandler<RunAgentQuery, AgentReply>
{
    public async System.Threading.Tasks.Task<AgentReply> Handle(RunAgentQuery query, CancellationToken ct)
    {
        var entitlement = await entitlements.GetForUserAsync(currentUser.UserId, ct);
        if (!entitlement.AiChatbotEnabled)
        {
            throw new PlanUpgradeRequiredException(
                "AI chatbot không có trong gói hiện tại. Nâng cấp gói để sử dụng trợ lý.",
                limit: null,
                usage: 0);
        }

        return await agent.RunAsync(query.Message, query.ProjectId, ct);
    }
}
