using TaskGenie.Domain.Entities;

namespace TaskGenie.Application.Features.Payments.DTOs;

public sealed class PaymentDto
{
    public int PaymentId { get; init; }
    public long OrderCode { get; init; }
    public int OrganizationId { get; init; }
    public string Provider { get; init; } = null!;
    public string Purpose { get; init; } = null!;
    public string? PackageCode { get; init; }
    public long Amount { get; init; }
    public string Status { get; init; } = null!;
    public DateTime CreatedAt { get; init; }
    public DateTime? PaidAt { get; init; }

    public static PaymentDto FromEntity(Payment p) => new()
    {
        PaymentId = p.PaymentId,
        OrderCode = p.OrderCode,
        OrganizationId = p.OrganizationId,
        Provider = p.Provider,
        Purpose = p.Purpose,
        PackageCode = p.PackageCode,
        Amount = p.Amount,
        Status = p.Status,
        CreatedAt = p.CreatedAt,
        PaidAt = p.PaidAt
    };
}

public sealed record CreatePaymentResultDto(long OrderCode, string CheckoutUrl, string? QrCode);
