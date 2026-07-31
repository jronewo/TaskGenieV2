using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Features.Payments.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Commands;

public sealed record CreateAiQuotaTopUpPaymentCommand(
    int OrganizationId,
    int RequestedByUserId,
    string Provider,
    string PackageCode,
    string ReturnUrl,
    string CancelUrl) : IRequest<CreatePaymentResultDto>;

public sealed class CreateAiQuotaTopUpPaymentCommandValidator : AbstractValidator<CreateAiQuotaTopUpPaymentCommand>
{
    public CreateAiQuotaTopUpPaymentCommandValidator()
    {
        RuleFor(x => x.Provider).Must(p => p is PaymentProviders.PayOS or PaymentProviders.Momo)
            .WithMessage("Provider must be 'PayOS' or 'Momo'.");
        RuleFor(x => x.PackageCode).Must(code => PaymentCatalog.AiQuotaPackages.ContainsKey(code))
            .WithMessage($"PackageCode must be one of: {string.Join(", ", PaymentCatalog.AiQuotaPackages.Keys)}.");
        RuleFor(x => x.ReturnUrl).NotEmpty();
        RuleFor(x => x.CancelUrl).NotEmpty();
    }
}

public sealed class CreateAiQuotaTopUpPaymentCommandHandler(
    IOrganizationRepository organizationRepo,
    IPaymentRepository paymentRepo,
    IPayOSService payOSService,
    IMomoService momoService,
    IOptions<AppUrlOptions> appUrlOptions
) : IRequestHandler<CreateAiQuotaTopUpPaymentCommand, CreatePaymentResultDto>
{
    public async Task<CreatePaymentResultDto> Handle(CreateAiQuotaTopUpPaymentCommand request, CancellationToken ct)
    {
        var org = await organizationRepo.GetByIdAsync(request.OrganizationId, ct)
            ?? throw new NotFoundException(nameof(Organization), request.OrganizationId);

        if (org.OwnerId != request.RequestedByUserId)
            throw new UnauthorizedAccessException("Only the organization owner can buy AI quota.");

        // Validator already checked PackageCode exists in the catalog.
        var (quota, amount) = PaymentCatalog.AiQuotaPackages[request.PackageCode];
        var orderCode = PaymentOrderCode.Generate();
        var description = $"AI +{quota} #{org.OrganizationId}";

        var payment = Payment.Create(
            orderCode,
            org.OrganizationId,
            request.Provider,
            PaymentPurposes.AiQuotaTopUp,
            packageCode: request.PackageCode,
            amount,
            request.RequestedByUserId,
            expiresAt: DateTime.UtcNow.AddMinutes(15));

        await paymentRepo.AddAsync(payment, ct);

        string checkoutUrl;
        string? qrCode = null;

        if (request.Provider == PaymentProviders.PayOS)
        {
            var result = await payOSService.CreatePaymentLinkAsync(
                orderCode, amount, description, request.ReturnUrl, request.CancelUrl, ct);
            checkoutUrl = result.CheckoutUrl;
            qrCode = result.QrCode;
        }
        else
        {
            var ipnUrl = $"{appUrlOptions.Value.BackendBaseUrl.TrimEnd('/')}/api/payments/webhook/momo";
            checkoutUrl = await momoService.CreatePaymentUrlAsync(
                orderCode.ToString(), amount, description, request.ReturnUrl, ipnUrl, ct: ct);
        }

        return new CreatePaymentResultDto(orderCode, checkoutUrl, qrCode);
    }
}
