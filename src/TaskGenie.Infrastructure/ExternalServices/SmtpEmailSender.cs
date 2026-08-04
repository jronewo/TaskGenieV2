using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Interfaces;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>
/// Real delivery over SMTP, using the client built into .NET so no mail library is pulled in.
///
/// Nothing here ever logs the password or the raw reset token — the token goes in the message body
/// and nowhere else, which is the whole point of routing it through a sender rather than returning
/// it from the API.
/// </summary>
public sealed class SmtpEmailSender(
    IOptions<SmtpSettings> settings,
    IOptions<AppUrlSettings> appUrls,
    ILogger<SmtpEmailSender> logger
) : IEmailSender
{
    public System.Threading.Tasks.Task SendPasswordResetEmailAsync(
        string toEmail,
        string resetToken,
        CancellationToken ct = default)
    {
        var resetUrl = $"{appUrls.Value.BaseUrl.TrimEnd('/')}/?reset-token={Uri.EscapeDataString(resetToken)}";

        var body = $"""
            <p>Xin chào,</p>
            <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu TaskGenie.</p>
            <p><a href="{WebUtility.HtmlEncode(resetUrl)}">Đặt lại mật khẩu</a></p>
            <p>Nếu không phải bạn, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
            """;

        return SendAsync(toEmail, "Đặt lại mật khẩu TaskGenie", body, ct);
    }

    public System.Threading.Tasks.Task SendTeamInvitationEmailAsync(
        string toEmail,
        string teamName,
        string invitedByName,
        string respondUrl,
        CancellationToken ct = default)
    {
        var team = WebUtility.HtmlEncode(teamName);
        var inviter = WebUtility.HtmlEncode(invitedByName);
        var url = WebUtility.HtmlEncode(respondUrl);

        // The link opens the notification centre; it carries no decision token, so forwarding the
        // mail cannot accept on the addressee's behalf.
        var body = $"""
            <p>Xin chào,</p>
            <p><strong>{inviter}</strong> mời bạn tham gia nhóm <strong>{team}</strong> trên TaskGenie.</p>
            <p><a href="{url}">Mở TaskGenie để chấp nhận hoặc từ chối</a></p>
            <p>Bạn cần đăng nhập bằng chính tài khoản này để trả lời lời mời.</p>
            """;

        return SendAsync(toEmail, $"Lời mời tham gia {teamName}", body, ct);
    }

    public System.Threading.Tasks.Task SendSubscriptionExpiryEmailAsync(
        string toEmail,
        string planName,
        int daysRemaining,
        DateTime periodEnd,
        string manageUrl,
        CancellationToken ct = default)
    {
        var plan = WebUtility.HtmlEncode(planName);
        var url = WebUtility.HtmlEncode(manageUrl);
        var endsOn = periodEnd.ToString("dd/MM/yyyy");
        var expired = daysRemaining <= 0;

        // Says what is actually lost, not just "your plan expired" — someone who cannot see the
        // consequence has no reason to act on the mail.
        var body = expired
            ? $"""
                <p>Xin chào,</p>
                <p>Gói <strong>{plan}</strong> của bạn đã hết hạn ngày <strong>{endsOn}</strong>.</p>
                <p>Tài khoản đã trở về gói miễn phí: tối đa 2 dự án, không dùng được trợ lý AI,
                   và các tính năng tổ chức đã bị ẩn cho tới khi bạn gia hạn.</p>
                <p><a href="{url}">Gia hạn gói</a></p>
                """
            : $"""
                <p>Xin chào,</p>
                <p>Gói <strong>{plan}</strong> của bạn sẽ hết hạn sau <strong>{daysRemaining} ngày</strong>
                   (ngày {endsOn}).</p>
                <p>Sau thời điểm đó tài khoản trở về gói miễn phí: tối đa 2 dự án, không dùng được
                   trợ lý AI, và các tính năng tổ chức sẽ bị ẩn.</p>
                <p><a href="{url}">Gia hạn ngay</a></p>
                """;

        var subject = expired
            ? $"Gói {planName} đã hết hạn"
            : $"Gói {planName} sắp hết hạn ({daysRemaining} ngày)";

        return SendAsync(toEmail, subject, body, ct);
    }

    private async System.Threading.Tasks.Task SendAsync(string to, string subject, string html, CancellationToken ct)
    {
        var config = settings.Value;

        using var message = new MailMessage
        {
            From = new MailAddress(config.ResolvedFromAddress, config.FromName),
            Subject = subject,
            Body = html,
            IsBodyHtml = true,
        };
        message.To.Add(to);

        using var client = new SmtpClient(config.Host, config.Port)
        {
            EnableSsl = config.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
        };

        if (!string.IsNullOrWhiteSpace(config.UserName))
        {
            client.Credentials = new NetworkCredential(config.UserName, config.Password);
        }

        try
        {
            await client.SendMailAsync(message, ct);
            // Address only — never the subject line's contents or any token.
            logger.LogInformation("Email delivered to {Email}.", to);
        }
        catch (Exception ex)
        {
            // Rethrown: callers decide whether a failed send is fatal. Invitation creation already
            // treats it as non-fatal, while a password reset that cannot be delivered is worth
            // surfacing rather than pretending it went out.
            logger.LogError(ex, "SMTP delivery to {Email} failed via {Host}:{Port}.", to, config.Host, config.Port);
            throw;
        }
    }
}
