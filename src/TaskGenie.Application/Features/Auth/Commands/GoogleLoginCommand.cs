using MediatR;
using TaskGenie.Application.Features.Auth.DTOs;

namespace TaskGenie.Application.Features.Auth.Commands;

public record GoogleLoginCommand(string IdToken) : IRequest<AuthResponse>;
