using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class ProjectEvaluationRepository : IProjectEvaluationRepository
{
    private readonly AppDbContext _context;

    public ProjectEvaluationRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProjectEvaluation?> GetByProjectIdAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.ProjectEvaluations
            .Include(pe => pe.Evaluator)
            .FirstOrDefaultAsync(pe => pe.ProjectId == projectId, ct);
    }

    public async Task<ProjectEvaluation?> GetByIdAsync(int evaluationId, CancellationToken ct = default)
    {
        return await _context.ProjectEvaluations
            .Include(pe => pe.Evaluator)
            .FirstOrDefaultAsync(pe => pe.EvaluationId == evaluationId, ct);
    }

    public async Task<bool> ExistsByProjectIdAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.ProjectEvaluations.AnyAsync(pe => pe.ProjectId == projectId, ct);
    }

    public async Task AddAsync(ProjectEvaluation evaluation, CancellationToken ct = default)
    {
        await _context.ProjectEvaluations.AddAsync(evaluation, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(ProjectEvaluation evaluation, CancellationToken ct = default)
    {
        _context.ProjectEvaluations.Update(evaluation);
        await _context.SaveChangesAsync(ct);
    }
}
