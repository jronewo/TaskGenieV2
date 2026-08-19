using MediatR;

namespace TaskGenie.Application.Features.Users.Commands;

/// <summary>Always applies to the authenticated user — the actor is never taken from the client.</summary>
public record UploadAvatarCommand(Stream ImageStream, string FileName) : IRequest<string>;
