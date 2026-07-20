using MediatR;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Application.Common.Exceptions;

namespace TaskGenie.Application.Features.Evidence;

public sealed record CreateTaskEvidenceCommand(
    int TaskId,
    int SubmittedBy,
    string EvidenceType,
    string? Description,
    int? TaskLogId,
    string? ExternalUrl,
    string? FileName,
    string? MimeType,
    long? SizeBytes,
    string? StorageUrl,
    string? StoragePublicId) : IRequest<EvidenceDto>;

public sealed class CreateTaskEvidenceCommandHandler(
    ITaskRepository taskRepository,
    ITaskLogRepository taskLogRepository,
    IEvidenceRepository evidenceRepository)
    : IRequestHandler<CreateTaskEvidenceCommand, EvidenceDto>
{
    private const long MaximumFileSize = 25L * 1024 * 1024;
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    public async Task<EvidenceDto> Handle(CreateTaskEvidenceCommand cmd, CancellationToken ct)
    {
        _ = await taskRepository.GetByIdAsync(cmd.TaskId, ct)
            ?? throw new NotFoundException("Task", cmd.TaskId);

        if (cmd.TaskLogId.HasValue)
        {
            var logs = await taskLogRepository.GetByTaskIdAsync(cmd.TaskId, ct);
            if (logs.All(log => log.LogId != cmd.TaskLogId.Value))
                throw new InvalidOperationException("Task log does not belong to the requested task.");
        }

        int? attachmentId = null;
        if (!string.IsNullOrWhiteSpace(cmd.StorageUrl))
        {
            if (string.IsNullOrWhiteSpace(cmd.FileName) || string.IsNullOrWhiteSpace(cmd.MimeType) || !cmd.SizeBytes.HasValue)
                throw new ArgumentException("File name, MIME type and size are required for attachment evidence.");
            if (cmd.SizeBytes.Value > MaximumFileSize)
                throw new ArgumentException("Attachment exceeds the 25 MB limit.");
            if (!AllowedMimeTypes.Contains(cmd.MimeType))
                throw new ArgumentException($"MIME type '{cmd.MimeType}' is not allowed.");

            var attachment = Attachment.Create(
                cmd.TaskId,
                cmd.FileName,
                cmd.MimeType,
                cmd.SizeBytes.Value,
                cmd.StorageUrl,
                cmd.StoragePublicId,
                cmd.SubmittedBy);
            attachment = await evidenceRepository.AddAttachmentAsync(attachment, ct);
            attachmentId = attachment.AttachmentId;
        }

        var evidence = TaskEvidence.Create(
            cmd.TaskId,
            cmd.SubmittedBy,
            cmd.EvidenceType,
            cmd.Description,
            cmd.TaskLogId,
            attachmentId,
            cmd.ExternalUrl);
        evidence = await evidenceRepository.AddEvidenceAsync(evidence, ct);

        var persisted = (await evidenceRepository.GetByTaskIdAsync(cmd.TaskId, ct))
            .First(item => item.EvidenceId == evidence.EvidenceId);
        return EvidenceDto.FromEntity(persisted);
    }
}
