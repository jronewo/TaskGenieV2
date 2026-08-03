using FluentValidation;
using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Payments.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Commands;

/// <summary>
/// A user buying their own Pro plan directly — independent of any Organization they may own.
/// Unlike <see cref="CreateOrganizationUpgradePaymentCommand"/>, individuals may choose Monthly
/// or Yearly (see <see cref="PaymentCatalog.ProPlans"/>).
/// </summary>
public sealed record CreateUserUpgradePaymentCommand(
    int UserId,
    string PackageCode,
    string ReturnUrl,
    string CancelUrl) : IRequest<CreatePaymentResultDto>;

public sealed class CreateUserUpgradePaymentCommandValidator : AbstractValidator<CreateUserUpgradePaymentCommand>
{
    public CreateUserUpgradePaymentCommandValidator()
    {
        RuleFor(x => x.PackageCode).Must(code => PaymentCatalog.ProPlans.ContainsKey(code))
            .WithMessage($"PackageCode must be one of: {string.Join(", ", PaymentCatalog.ProPlans.Keys)}.");
        RuleFor(x => x.ReturnUrl).NotEmpty();
        RuleFor(x => x.CancelUrl).NotEmpty();
    }
}

public sealed class CreateUserUpgradePaymentCommandHandler(
    IUserRepository userRepo,
    IPaymentRepository paymentRepo,
    IPayOSService payOSService
) : IRequestHandler<CreateUserUpgradePaymentCommand, CreatePaymentResultDto>
{
    public async Task<CreatePaymentResultDto> Handle(CreateUserUpgradePaymentCommand request, CancellationToken ct)
    {
        var user = await userRepo.GetByIdAsync(request.UserId, ct)
            ?? throw new NotFoundException(nameof(User), request.UserId);

        // Validator already checked PackageCode exists in the catalog.
        var (duration, amount) = PaymentCatalog.ProPlans[request.PackageCode];
        var orderCode = PaymentOrderCode.Generate();
        var cycleLabel = duration.TotalDays >= 300 ? "1yr" : "1mo";
        // payOS caps `description` at 25 characters — keep it short.
        var description = $"TaskGenie Pro {cycleLabel} #{user.UserId}";

        var payment = Payment.Create(
            orderCode,
            organizationId: null,
            PaymentPurposes.UserUpgrade,
            packageCode: request.PackageCode,
            amount,
            requestedByUserId: request.UserId,
            expiresAt: DateTime.UtcNow.AddMinutes(15));

        await paymentRepo.AddAsync(payment, ct);

        var result = await payOSService.CreatePaymentLinkAsync(
            orderCode, amount, description, request.ReturnUrl, request.CancelUrl, ct);

        return new CreatePaymentResultDto(orderCode, result.CheckoutUrl, result.QrCode);
    }
}
