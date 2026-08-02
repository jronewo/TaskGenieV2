namespace TaskGenie.Application.Common.Security;

/// <summary>
/// Google returns a profile picture URL with no size on it, and that bare URL answers 400 — the
/// host only serves the image once a size directive is appended. Storing what Google handed us
/// therefore produced avatars that never loaded for anyone who signed in with Google.
/// </summary>
public static class GoogleAvatarUrl
{
    /// <summary>Square crop, large enough for the profile page without being wasteful.</summary>
    private const string SizeDirective = "=s256-c";

    public static string? Normalize(string? pictureUrl)
    {
        if (string.IsNullOrWhiteSpace(pictureUrl)) return pictureUrl;
        if (!pictureUrl.Contains("googleusercontent.com", StringComparison.OrdinalIgnoreCase)) return pictureUrl;

        // A URL that already carries a directive (=s96-c, =s400) is left exactly as it is.
        var lastSegment = pictureUrl[(pictureUrl.LastIndexOf('/') + 1)..];
        if (lastSegment.Contains('=')) return pictureUrl;

        return pictureUrl + SizeDirective;
    }
}
