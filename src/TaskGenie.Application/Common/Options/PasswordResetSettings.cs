namespace TaskGenie.Application.Common.Options;

public class PasswordResetSettings
{
    public const string SectionName = "PasswordReset";

    public int TokenExpirationMinutes { get; set; } = 30;
}
