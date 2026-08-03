using FluentValidation;
using MediatR;
using TaskGenie.Application.Common.Exceptions;
using TaskGenie.Application.Features.Payments.DTOs;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.Payments.Commands;

public sealed record CreateAiQuotaTopUpPaymentCommand(
    int OrganizationId,
    int RequestedByUserId,
    string PackageCode,
    string ReturnUrl,
    string CancelUrl) : IRequest<CreatePaymentResultDto>;

public sealed class CreateAiQuotaTopUpPaymentCommandValidator : AbstractValidator<CreateAiQuotaTopUpPaymentCommand>
{
    public CreateAiQuotaTopUpPaymentCommandValidator()
    {
        RuleFor(x => x.PackageCode).Must(code => PaymentCatalog.AiQuotaPackages.ContainsKey(code))
            .WithMessage($"PackageCode must be one of: {string.Join(", ", PaymentCatalog.AiQuotaPackages.Keys)}.");
        RuleFor(x => x.ReturnUrl).NotEmpty();
        RuleFor(x => x.CancelUrl).NotEmpty();
    }
}

public sealed class CreateAiQuotaTopUpPaymentCommandHandler(
    IOrganizationRepository organizationRepo,
    IPaymentRepository paymentRepo,
    IPayOSService payOSService
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
            PaymentPurposes.AiQuotaTopUp,
            packageCode: request.PackageCode,
            amount,
            request.RequestedByUserId,
            expiresAt: DateTime.UtcNow.AddMinutes(15));

        await paymentRepo.AddAsync(payment, ct);

        var result = await payOSService.CreatePaymentLinkAsync(
            orderCode, amount, description, request.ReturnUrl, request.CancelUrl, ct);

        return new CreatePaymentResultDto(orderCode, result.CheckoutUrl, result.QrCode);
    }
}
