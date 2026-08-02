using MediatR;

namespace TaskGenie.Application.Features.Auth.Commands;

public record ForgotPasswordCommand(string Email) : IRequest<ForgotPasswordResult>;

public record ForgotPasswordResult(string Message);
