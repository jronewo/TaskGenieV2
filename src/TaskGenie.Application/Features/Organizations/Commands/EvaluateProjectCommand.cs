using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

public sealed record EvaluateProjectCommand(
    int ProjectId,
    int EvaluatorId,
    int? OverallScore,
    int? QualityScore,
    int? TimelinessScore,
    int? CommunicationScore,
    string? Comment
) : IRequest<bool>;

public sealed class EvaluateProjectCommandHandler(
    IProjectEvaluationRepository evaluationRepo
) : IRequestHandler<EvaluateProjectCommand, bool>
{
    public async Task<bool> Handle(EvaluateProjectCommand cmd, CancellationToken ct)
    {
        // Prevent double evaluation
        var exists = await evaluationRepo.ExistsByProjectIdAsync(cmd.ProjectId, ct);
        if (exists) return false;

        var evaluation = ProjectEvaluation.Create(
            projectId: cmd.ProjectId,
            evaluatorId: cmd.EvaluatorId,
            overallScore: cmd.OverallScore,
            qualityScore: cmd.QualityScore,
            timelinessScore: cmd.TimelinessScore,
            communicationScore: cmd.CommunicationScore,
            comment: cmd.Comment
        );

        await evaluationRepo.AddAsync(evaluation, ct);
        return true;
    }
}
