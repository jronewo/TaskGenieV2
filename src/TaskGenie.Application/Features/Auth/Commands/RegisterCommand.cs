using MediatR;

namespace TaskGenie.Application.Features.Auth.Commands;

public record RegisterCommand(string Name, string Email, string Password) : IRequest<string>;
