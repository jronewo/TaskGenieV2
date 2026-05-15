using MediatR;

namespace TaskGenie.Application.Features.Users.Commands;

public record UploadAvatarCommand(int UserId, Stream ImageStream, string FileName) : IRequest<string>;
