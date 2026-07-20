using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IEvidenceRepository
{
    System.Threading.Tasks.Task<Attachment> AddAttachmentAsync(Attachment attachment, CancellationToken ct = default);
    System.Threading.Tasks.Task<TaskEvidence> AddEvidenceAsync(TaskEvidence evidence, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<TaskEvidence>> GetByTaskIdAsync(int taskId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Attachment?> GetAttachmentByIdAsync(int attachmentId, CancellationToken ct = default);
}
