namespace TaskGenie.Application.Interfaces;

public record MomoIpnPayload(
    string PartnerCode,
    string OrderId,
    string RequestId,
    long Amount,
    string OrderInfo,
    string OrderType,
    long TransId,
    int ResultCode,
    string Message,
    string PayType,
    long ResponseTime,
    string ExtraData,
    string Signature);

public interface IMomoService
{
    /// <summary>Creates a MoMo checkout link (captureWallet flow) and returns the payUrl to redirect the user to.</summary>
    Task<string> CreatePaymentUrlAsync(
        string orderId,
        long amount,
        string orderInfo,
        string returnUrl,
        string ipnUrl,
        string extraData = "",
        CancellationToken ct = default);

    /// <summary>Recomputes the IPN signature and compares it against <paramref name="payload"/>.Signature.</summary>
    bool VerifyIpnSignature(MomoIpnPayload payload);
}
