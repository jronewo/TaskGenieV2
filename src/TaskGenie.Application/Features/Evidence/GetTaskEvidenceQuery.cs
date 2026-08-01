using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Evidence;

public sealed record GetTaskEvidenceQuery(int TaskId) : IRequest<List<EvidenceDto>>;

public sealed class GetTaskEvidenceQueryHandler(IResourceAuthorizationService authz, IEvidenceRepository evidenceRepository)
    : IRequestHandler<GetTaskEvidenceQuery, List<EvidenceDto>>
{
    public async Task<List<EvidenceDto>> Handle(GetTaskEvidenceQuery query, CancellationToken ct)
    {
        await authz.EnsureCanAccessTaskAsync(query.TaskId, ct);

        var evidence = await evidenceRepository.GetByTaskIdAsync(query.TaskId, ct);
        return evidence.Select(EvidenceDto.FromEntity).ToList();
    }
}
