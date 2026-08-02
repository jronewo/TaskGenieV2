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

public sealed class RunAgentQueryHandler(IProjectAgent agent) : IRequestHandler<RunAgentQuery, AgentReply>
{
    public System.Threading.Tasks.Task<AgentReply> Handle(RunAgentQuery query, CancellationToken ct)
        => agent.RunAsync(query.Message, query.ProjectId, ct);
}
