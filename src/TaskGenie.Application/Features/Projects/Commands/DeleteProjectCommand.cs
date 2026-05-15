using MediatR;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Projects.Commands;

public sealed record DeleteProjectCommand(int ProjectId) : IRequest<bool>;

public sealed class DeleteProjectCommandHandler(
    IProjectRepository projectRepo
) : IRequestHandler<DeleteProjectCommand, bool>
{
    public async Task<bool> Handle(DeleteProjectCommand cmd, CancellationToken ct)
    {
        await projectRepo.DeleteAsync(cmd.ProjectId, ct);
        return true;
    }
}
