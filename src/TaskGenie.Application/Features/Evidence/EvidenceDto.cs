using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Evidence;

public sealed class EvidenceDto
{
    public int EvidenceId { get; init; }
    public int TaskId { get; init; }
    public int? TaskLogId { get; init; }
    public string EvidenceType { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? ExternalUrl { get; init; }
    public AttachmentDto? Attachment { get; init; }
    public int SubmittedBy { get; init; }
    public DateTime CreatedAt { get; init; }

    public static EvidenceDto FromEntity(TaskEvidence evidence) => new()
    {
        EvidenceId = evidence.EvidenceId,
        TaskId = evidence.TaskId,
        TaskLogId = evidence.TaskLogId,
        EvidenceType = evidence.EvidenceType,
        Description = evidence.Description,
        ExternalUrl = evidence.ExternalUrl,
        Attachment = evidence.Attachment is null ? null : AttachmentDto.FromEntity(evidence.Attachment),
        SubmittedBy = evidence.SubmittedBy,
        CreatedAt = evidence.CreatedAt
    };
}

public sealed class AttachmentDto
{
    public int AttachmentId { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string MimeType { get; init; } = string.Empty;
    public long SizeBytes { get; init; }
    public string StorageUrl { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }

    public static AttachmentDto FromEntity(Attachment attachment) => new()
    {
        AttachmentId = attachment.AttachmentId,
        FileName = attachment.FileName,
        MimeType = attachment.MimeType,
        SizeBytes = attachment.SizeBytes,
        StorageUrl = attachment.StorageUrl,
        CreatedAt = attachment.CreatedAt
    };
}
