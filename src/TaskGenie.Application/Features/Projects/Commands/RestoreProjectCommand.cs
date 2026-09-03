using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Projects.Commands;

/// <summary>Undoes a soft-delete while the project is still inside its grace period.</summary>
public sealed record RestoreProjectCommand(int ProjectId) : IRequest<bool>;

public sealed class RestoreProjectCommandHandler(
    IResourceAuthorizationService authz,
    IProjectLifecycleService lifecycle
) : IRequestHandler<RestoreProjectCommand, bool>
{
    public async Task<bool> Handle(RestoreProjectCommand cmd, CancellationToken ct)
    {
        var project = await authz.EnsureCanManageProjectAsync(cmd.ProjectId, ct);
        await lifecycle.RestoreProjectAsync(project, ct);
        return true;
    }
}
