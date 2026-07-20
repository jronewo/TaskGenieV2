namespace TaskGenie.Domain.Entities;

public class TaskEvidence
{
    protected TaskEvidence() { }

    public int EvidenceId { get; internal set; }
    public int TaskId { get; internal set; }
    public int? TaskLogId { get; internal set; }
    public int? AttachmentId { get; internal set; }
    public string? ExternalUrl { get; internal set; }
    public string EvidenceType { get; internal set; } = null!;
    public string? Description { get; internal set; }
    public int SubmittedBy { get; internal set; }
    public DateTime CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }
    public virtual TaskLog? TaskLog { get; internal set; }
    public virtual Attachment? Attachment { get; internal set; }
    public virtual User? Submitter { get; internal set; }

    public static TaskEvidence Create(
        int taskId,
        int submittedBy,
        string evidenceType,
        string? description,
        int? taskLogId = null,
        int? attachmentId = null,
        string? externalUrl = null)
    {
        if (attachmentId is null && string.IsNullOrWhiteSpace(externalUrl))
            throw new ArgumentException("Either an attachment or an external URL is required.");

        if (!string.IsNullOrWhiteSpace(externalUrl) &&
            (!Uri.TryCreate(externalUrl, UriKind.Absolute, out var uri) ||
             (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)))
            throw new ArgumentException("Evidence URL must be an absolute HTTP or HTTPS URL.", nameof(externalUrl));

        return new TaskEvidence
        {
            TaskId = taskId,
            TaskLogId = taskLogId,
            AttachmentId = attachmentId,
            ExternalUrl = string.IsNullOrWhiteSpace(externalUrl) ? null : externalUrl.Trim(),
            EvidenceType = string.IsNullOrWhiteSpace(evidenceType) ? "OTHER" : evidenceType.Trim().ToUpperInvariant(),
            Description = description?.Trim(),
            SubmittedBy = submittedBy,
            CreatedAt = DateTime.UtcNow
        };
    }
}
