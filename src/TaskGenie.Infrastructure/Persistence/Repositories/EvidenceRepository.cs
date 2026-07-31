using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public sealed class EvidenceRepository(AppDbContext context) : IEvidenceRepository
{
    public async Task<Attachment> AddAttachmentAsync(Attachment attachment, CancellationToken ct = default)
    {
        context.Attachments.Add(attachment);
        await context.SaveChangesAsync(ct);
        return attachment;
    }

    public async Task<TaskEvidence> AddEvidenceAsync(TaskEvidence evidence, CancellationToken ct = default)
    {
        context.TaskEvidences.Add(evidence);
        await context.SaveChangesAsync(ct);
        return evidence;
    }

    public async Task<List<TaskEvidence>> GetByTaskIdAsync(int taskId, CancellationToken ct = default) =>
        await context.TaskEvidences
            .Where(evidence => evidence.TaskId == taskId)
            .Include(evidence => evidence.Attachment)
            .OrderByDescending(evidence => evidence.CreatedAt)
            .ToListAsync(ct);

    public async Task<Attachment?> GetAttachmentByIdAsync(int attachmentId, CancellationToken ct = default) =>
        await context.Attachments.FirstOrDefaultAsync(file => file.AttachmentId == attachmentId, ct);
}
