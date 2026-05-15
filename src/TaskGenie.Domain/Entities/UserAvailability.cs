using System;
using System.Collections.Generic;

namespace TaskGenie.Domain.Entities;

public class UserAvailability
{
    protected UserAvailability() { }

    public int Id { get; internal set; }

    public int? UserId { get; internal set; }

    public int? DayOfWeek { get; internal set; }

    public int? AvailableHours { get; internal set; }

    public virtual User? User { get; internal set; }
}
