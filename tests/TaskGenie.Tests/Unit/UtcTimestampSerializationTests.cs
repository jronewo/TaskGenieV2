using System.Text.Json;

namespace TaskGenie.Tests.Unit;

/// <summary>
/// Timestamps must reach a client as UTC, explicitly.
///
/// SQL Server's `datetime` carries no offset, so a value read back arrives with
/// <see cref="DateTimeKind.Unspecified"/>. Serialised that way it loses the trailing `Z`, and
/// every client — browser and React Native alike — then reads it as local time. In Vietnam that
/// showed every notification seven hours early.
///
/// These pin the two halves of the fix: what the wrong shape looks like, and that tagging the kind
/// is what corrects it.
/// </summary>
public sealed class UtcTimestampSerializationTests
{
    [Fact]
    public void AnUnspecifiedKindSerialisesWithoutTheUtcMarker()
    {
        var fromDatabase = new DateTime(2026, 8, 4, 10, 17, 7, DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(fromDatabase);

        // This is the bug in one line: no Z, so the client is free to guess — and guesses local.
        Assert.DoesNotContain("Z", json);
    }

    [Fact]
    public void TaggingTheKindAsUtcAddsTheMarkerClientsNeed()
    {
        var fromDatabase = new DateTime(2026, 8, 4, 10, 17, 7, DateTimeKind.Unspecified);

        var tagged = DateTime.SpecifyKind(fromDatabase, DateTimeKind.Utc);
        var json = JsonSerializer.Serialize(tagged);

        Assert.Contains("Z", json);
        // The instant itself is untouched — only how it is labelled changes.
        Assert.Equal(fromDatabase.TimeOfDay, tagged.TimeOfDay);
    }

    /// <summary>
    /// What the user actually reported: a notification written at 10:17 UTC showing as 10:17 in
    /// Vietnam rather than 17:17. Seven hours is exactly the offset, which is what identified it.
    /// </summary>
    [Fact]
    public void AUtcInstantConvertsToVietnamTimeSevenHoursLater()
    {
        var utc = new DateTime(2026, 8, 4, 10, 17, 7, DateTimeKind.Utc);
        var vietnam = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, vietnam);

        Assert.Equal(17, local.Hour);
        Assert.Equal(7, (local - utc).TotalHours);
    }
}
