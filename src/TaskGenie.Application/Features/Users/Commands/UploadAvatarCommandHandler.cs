using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Users.Commands;

public class UploadAvatarCommandHandler(
    IUserRepository userRepository,
    ICloudinaryService cloudinaryService)
    : IRequestHandler<UploadAvatarCommand, string>
{
    public async Task<string> Handle(UploadAvatarCommand request, CancellationToken ct)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException("User", request.UserId);

        var url = await cloudinaryService.UploadImageAsync(request.ImageStream, request.FileName, "taskgenie/avatars")
            ?? throw new InvalidOperationException("Image upload failed.");

        user.UpdateProfile(null, url);
        await userRepository.UpdateUserAsync(user, ct);

        return url;
    }
}
