using TaskGenie.Domain.Entities;

namespace TaskGenie.Tests.Application;

/// <summary>
/// Suspension rules on the entity itself. Banning is preferred over deletion because the person's
/// tasks, comments and evaluations stay attached to a real account — so the rules that matter are
/// that a temporary ban ends by itself and that reactivating leaves no stale end date behind.
/// </summary>
public sealed class UserBanTests
{
    private static readonly DateTime Now = new(2026, 8, 2, 12, 0, 0, DateTimeKind.Utc);

    private static User NewUser()
    {
        var user = User.Create("Someone", $"user-{Guid.NewGuid():N}@example.com", "hash");
        user.SetStatus(1);
        return user;
    }

    [Fact]
    public void ATemporaryBan_RecordsWhenItEnds()
    {
        var user = NewUser();

        user.Ban(Now.AddDays(7), "Spam");

        Assert.Equal(0, user.Status);
        Assert.Equal(Now.AddDays(7), user.BannedUntil);
        Assert.Equal("Spam", user.BanReason);
    }

    [Fact]
    public void APermanentBan_HasNoEndDate()
    {
        var user = NewUser();

        user.Ban(null, null);

        Assert.Equal(0, user.Status);
        Assert.Null(user.BannedUntil);
    }

    [Fact]
    public void ABlankReason_IsStoredAsNothingRatherThanWhitespace()
    {
        var user = NewUser();

        user.Ban(null, "   ");

        Assert.Null(user.BanReason);
    }

    [Fact]
    public void AnExpiredTemporaryBan_LiftsItself()
    {
        var user = NewUser();
        user.Ban(Now.AddDays(1), "Spam");

        var lifted = user.LiftBanIfExpired(Now.AddDays(2));

        Assert.True(lifted);
        Assert.Equal(1, user.Status);
        Assert.Null(user.BannedUntil);
        Assert.Null(user.BanReason);
    }

    [Fact]
    public void ABanStillInForce_IsNotLifted()
    {
        var user = NewUser();
        user.Ban(Now.AddDays(7), "Spam");

        Assert.False(user.LiftBanIfExpired(Now.AddDays(1)));
        Assert.Equal(0, user.Status);
    }

    [Fact]
    public void APermanentBan_NeverLiftsOnItsOwn()
    {
        var user = NewUser();
        user.Ban(null, "Fraud");

        // No end date means no amount of waiting restores access.
        Assert.False(user.LiftBanIfExpired(Now.AddYears(50)));
        Assert.Equal(0, user.Status);
    }

    [Fact]
    public void AnActiveAccount_IsNeverTouchedByTheExpiryCheck()
    {
        var user = NewUser();

        Assert.False(user.LiftBanIfExpired(Now));
        Assert.Equal(1, user.Status);
    }

    [Fact]
    public void Unbanning_ClearsTheEndDateAndTheReason()
    {
        var user = NewUser();
        user.Ban(Now.AddDays(30), "Spam");

        user.Unban();

        Assert.Equal(1, user.Status);
        // A stale end date would make the account look suspended in the admin table.
        Assert.Null(user.BannedUntil);
        Assert.Null(user.BanReason);
    }
}
