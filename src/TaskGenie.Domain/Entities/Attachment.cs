namespace TaskGenie.Domain.Entities;

public class Attachment
{
    protected Attachment() { }

    public int AttachmentId { get; internal set; }
    public int TaskId { get; internal set; }
    public string FileName { get; internal set; } = null!;
    public string MimeType { get; internal set; } = null!;
    public long SizeBytes { get; internal set; }
    public string StorageUrl { get; internal set; } = null!;
    public string? StoragePublicId { get; internal set; }
    public int UploadedBy { get; internal set; }
    public DateTime CreatedAt { get; internal set; }

    public virtual Task? Task { get; internal set; }
    public virtual User? Uploader { get; internal set; }

    public static Attachment Create(
        int taskId,
        string fileName,
        string mimeType,
        long sizeBytes,
        string storageUrl,
        string? storagePublicId,
        int uploadedBy)
    {
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("File name is required.", nameof(fileName));
        if (string.IsNullOrWhiteSpace(mimeType)) throw new ArgumentException("MIME type is required.", nameof(mimeType));
        if (sizeBytes < 0) throw new ArgumentOutOfRangeException(nameof(sizeBytes));
        if (string.IsNullOrWhiteSpace(storageUrl)) throw new ArgumentException("Storage URL is required.", nameof(storageUrl));

        return new Attachment
        {
            TaskId = taskId,
            FileName = fileName.Trim(),
            MimeType = mimeType.Trim(),
            SizeBytes = sizeBytes,
            StorageUrl = storageUrl.Trim(),
            StoragePublicId = storagePublicId,
            UploadedBy = uploadedBy,
            CreatedAt = DateTime.UtcNow
        };
    }
}
