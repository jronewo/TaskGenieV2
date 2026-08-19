using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Organizations.Commands;

public sealed record EvaluateProjectCommand(
    int OrganizationId,
    int ProjectId,
    int? OverallScore,
    int? QualityScore,
    int? TimelinessScore,
    int? CommunicationScore,
    string? Comment
) : IRequest<bool>;

public sealed class EvaluateProjectCommandHandler(
    ICurrentUser currentUser,
    IResourceAuthorizationService authorization,
    IProjectRepository projectRepo,
    IProjectEvaluationRepository evaluationRepo
) : IRequestHandler<EvaluateProjectCommand, bool>
{
    public async Task<bool> Handle(EvaluateProjectCommand cmd, CancellationToken ct)
    {
        // Only the organization owner (or a platform admin) may evaluate a delivered project —
        // enforced server-side, not just hidden in the UI.
        await authorization.EnsureCanAccessOrganizationAsync(cmd.OrganizationId, ct);

        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
        if (project is null || project.OrganizationId != cmd.OrganizationId)
            throw new NotFoundException("Project", cmd.ProjectId);

        // Prevent double evaluation
        var exists = await evaluationRepo.ExistsByProjectIdAsync(cmd.ProjectId, ct);
        if (exists) return false;

        var evaluation = ProjectEvaluation.Create(
            projectId: cmd.ProjectId,
            evaluatorId: currentUser.UserId,
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
