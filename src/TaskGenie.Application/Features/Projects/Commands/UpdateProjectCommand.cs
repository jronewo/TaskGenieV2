using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record UpdateProjectCommand(
    int ProjectId,
    string? Name,
    string? Description,
    string? Status,
    int? TeamId,
    DateOnly? Deadline
) : IRequest<bool>;

public sealed class UpdateProjectCommandHandler(
    IProjectRepository projectRepo
) : IRequestHandler<UpdateProjectCommand, bool>
{
    public async Task<bool> Handle(UpdateProjectCommand cmd, CancellationToken ct)
    {
        var project = await projectRepo.GetByIdAsync(cmd.ProjectId, ct);
        if (project is null) return false;

        project.Update(cmd.Name, cmd.Description, cmd.Status, cmd.TeamId, cmd.Deadline);

        await projectRepo.UpdateAsync(project, ct);
        return true;
    }
}
