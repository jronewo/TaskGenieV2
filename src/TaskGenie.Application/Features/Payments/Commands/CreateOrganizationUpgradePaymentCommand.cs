using FluentValidation;
using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Payments.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Commands;

public sealed record CreateOrganizationUpgradePaymentCommand(
    int OrganizationId,
    int RequestedByUserId,
    string ReturnUrl,
    string CancelUrl) : IRequest<CreatePaymentResultDto>;

public sealed class CreateOrganizationUpgradePaymentCommandValidator : AbstractValidator<CreateOrganizationUpgradePaymentCommand>
{
    public CreateOrganizationUpgradePaymentCommandValidator()
    {
        RuleFor(x => x.ReturnUrl).NotEmpty();
        RuleFor(x => x.CancelUrl).NotEmpty();
    }
}

public sealed class CreateOrganizationUpgradePaymentCommandHandler(
    IOrganizationRepository organizationRepo,
    IPaymentRepository paymentRepo,
    IPayOSService payOSService
) : IRequestHandler<CreateOrganizationUpgradePaymentCommand, CreatePaymentResultDto>
{
    public async Task<CreatePaymentResultDto> Handle(CreateOrganizationUpgradePaymentCommand request, CancellationToken ct)
    {
        var org = await organizationRepo.GetByIdAsync(request.OrganizationId, ct)
            ?? throw new NotFoundException(nameof(Organization), request.OrganizationId);

        if (org.OwnerId != request.RequestedByUserId)
            throw new UnauthorizedAccessException("Only the organization owner can upgrade its plan.");

        var orderCode = PaymentOrderCode.Generate();
        const long amount = PaymentCatalog.ProMonthlyPriceVnd;
        // payOS caps `description` at 25 characters — keep it short.
        var description = $"TaskGenie Pro #{org.OrganizationId}";

        var payment = Payment.Create(
            orderCode,
            org.OrganizationId,
            PaymentPurposes.OrganizationUpgrade,
            packageCode: "PRO_MONTHLY",
            amount,
            request.RequestedByUserId,
            expiresAt: DateTime.UtcNow.AddMinutes(15));

        await paymentRepo.AddAsync(payment, ct);

        var result = await payOSService.CreatePaymentLinkAsync(
            orderCode, amount, description, request.ReturnUrl, request.CancelUrl, ct);

        return new CreatePaymentResultDto(orderCode, result.CheckoutUrl, result.QrCode);
    }
}

/// <summary>Shared order-code generator: millisecond timestamp + random suffix, unique enough for
/// a single-instance backend and still well within payOS's int64 orderCode range. The Payment.OrderCode
/// column also has a unique index as a hard backstop.</summary>
internal static class PaymentOrderCode
{
    public static long Generate()
        => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000 + Random.Shared.Next(0, 1000);
}
