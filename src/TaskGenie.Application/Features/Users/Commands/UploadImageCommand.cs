using MediatR;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Application.Features.Users.Commands;

public record UploadImageCommand(Stream ImageStream, string FileName, string Folder = "taskgenie/comments") : IRequest<string>;

public class UploadImageCommandHandler(ICloudinaryService cloudinaryService)
    : IRequestHandler<UploadImageCommand, string>
{
    public async Task<string> Handle(UploadImageCommand request, CancellationToken ct)
    {
        var url = await cloudinaryService.UploadImageAsync(request.ImageStream, request.FileName, request.Folder)
            ?? throw new InvalidOperationException("Image upload failed.");
        return url;
    }
}
