using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record DeleteProjectCommand(int ProjectId) : IRequest<bool>;

public sealed class DeleteProjectCommandHandler(
    IResourceAuthorizationService authz,
    IProjectLifecycleService lifecycle
) : IRequestHandler<DeleteProjectCommand, bool>
{
    public async Task<bool> Handle(DeleteProjectCommand cmd, CancellationToken ct)
    {
        var project = await authz.EnsureCanManageProjectAsync(cmd.ProjectId, ct);
        await lifecycle.SoftDeleteProjectAsync(project, ct);
        return true;
    }
}
