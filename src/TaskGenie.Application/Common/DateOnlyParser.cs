using System.Globalization;

namespace TaskGenie.Application.Common;

public static class DateOnlyParser
{
    /// <summary>
    /// Parses a date-only value from either a plain date ("2026-07-25") or a full
    /// ISO-8601 date-time string ("2026-07-25T00:00:00Z"), since DateOnly.TryParse
    /// rejects the latter outright.
    /// </summary>
    public static DateOnly? TryParseFlexible(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        if (DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOnly))
            return dateOnly;

        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var dateTime))
            return DateOnly.FromDateTime(dateTime);

        return null;
    }
}
