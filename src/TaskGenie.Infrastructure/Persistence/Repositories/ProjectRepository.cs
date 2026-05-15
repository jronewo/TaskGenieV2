using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class ProjectRepository : IProjectRepository
{
    private readonly AppDbContext _context;

    public ProjectRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Project?> GetByIdAsync(int projectId, CancellationToken ct = default)
    {
        return await _context.Projects
            .Include(p => p.Team)
            .Include(p => p.Organization)
            .Include(p => p.Tasks)
            .FirstOrDefaultAsync(p => p.ProjectId == projectId, ct);
    }

    public async Task<List<Project>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Projects
            .Include(p => p.Organization)
            .Include(p => p.Team)
            .ToListAsync(ct);
    }

    public async Task<List<Project>> GetProjectsByUserIdAsync(int userId, CancellationToken ct = default)
    {
        return await _context.Projects
            .Include(p => p.Organization)
            .Include(p => p.Team)
            .Where(p => p.CreatedBy == userId || (p.Team != null && p.Team.TeamMembers.Any(m => m.UserId == userId)))
            .ToListAsync(ct);
    }

    public async Task<List<Project>> GetProjectsByOrgIdAsync(int orgId, CancellationToken ct = default)
    {
        return await _context.Projects
            .Where(p => p.OrganizationId == orgId)
            .Include(p => p.Team)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Project project, CancellationToken ct = default)
    {
        await _context.Projects.AddAsync(project, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Project project, CancellationToken ct = default)
    {
        _context.Projects.Update(project);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int projectId, CancellationToken ct = default)
    {
        var project = await _context.Projects.FindAsync(new object[] { projectId }, ct);
        if (project != null)
        {
            _context.Projects.Remove(project);
            await _context.SaveChangesAsync(ct);
        }
    }
}
