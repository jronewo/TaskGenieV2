using MediatR;
using TaskGenie.Application.Features.Auth.DTOs;

namespace TaskGenie.Application.Features.Auth.Commands;

public record RegisterCommand(string Name, string Email, string Password) : IRequest<AuthResponse>;
