using MediatR;

namespace TaskGenie.Application.Features.Users.Commands;

public record ChangePasswordCommand(int UserId, string CurrentPassword, string NewPassword) : IRequest<bool>;
