using MediatR;
using TaskGenie.Application.Features.Tasks.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Tasks.Queries;

public sealed record GetDependencyGraphQuery(int ProjectId) : IRequest<DependencyGraphDto>;

public sealed class GetDependencyGraphQueryHandler(
    IResourceAuthorizationService authz,
    ITaskRepository taskRepo,
    ITaskDependencyRepository dependencyRepo
) : IRequestHandler<GetDependencyGraphQuery, DependencyGraphDto>
{
    public async Task<DependencyGraphDto> Handle(GetDependencyGraphQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessProjectAsync(query.ProjectId, ct);

        var tasks = await taskRepo.GetByProjectIdAsync(query.ProjectId, ct);
        var graph = new DependencyGraphDto
        {
            Nodes = tasks.Select(t => new GraphNodeDto
            {
                Id = t.TaskId.ToString(),
                Title = t.Title ?? "Untitled",
                Status = t.Status
            }).ToList()
        };

        var edges = new List<GraphEdgeDto>();
        foreach (var t in tasks)
        {
            var deps = await dependencyRepo.GetByTaskIdAsync(t.TaskId, ct);
            foreach (var d in deps)
            {
                edges.Add(new GraphEdgeDto
                {
                    Id = $"e_{d.DependsOnTaskId}_{d.TaskId}",
                    Source = d.DependsOnTaskId.ToString(),
                    Target = d.TaskId.ToString()
                });
            }
        }

        return new DependencyGraphDto
        {
            Nodes = graph.Nodes,
            Edges = edges
        };
    }
}
