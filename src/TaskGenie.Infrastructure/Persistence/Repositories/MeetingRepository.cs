using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class MeetingRepository(AppDbContext context) : IMeetingRepository
{
    public async Task<Meeting?> GetByIdAsync(int meetingId, CancellationToken ct = default)
        => await context.Meetings
            .Include(m => m.Project)
            .Include(m => m.Organizer)
            .Include(m => m.Attendees)
                .ThenInclude(a => a.User)
            .FirstOrDefaultAsync(m => m.MeetingId == meetingId, ct);

    public async Task<List<Meeting>> GetByProjectIdAsync(int projectId, CancellationToken ct = default)
        => await context.Meetings
            .Include(m => m.Organizer)
            .Include(m => m.Attendees)
                .ThenInclude(a => a.User)
            .Where(m => m.ProjectId == projectId)
            .OrderBy(m => m.ScheduledAt)
            .ToListAsync(ct);

    public async Task<List<Meeting>> GetUpcomingByProjectAsync(int projectId, CancellationToken ct = default)
        => await context.Meetings
            .Include(m => m.Organizer)
            .Include(m => m.Attendees)
                .ThenInclude(a => a.User)
            .Where(m => m.ProjectId == projectId && m.ScheduledAt >= DateTime.UtcNow)
            .OrderBy(m => m.ScheduledAt)
            .ToListAsync(ct);

    public async Task<List<Meeting>> GetByUserIdAsync(int userId, CancellationToken ct = default)
        => await context.Meetings
            .Include(m => m.Project)
            .Include(m => m.Organizer)
            .Include(m => m.Attendees)
                .ThenInclude(a => a.User)
            .Where(m => m.OrganizedBy == userId || m.Attendees.Any(a => a.UserId == userId))
            .OrderBy(m => m.ScheduledAt)
            .ToListAsync(ct);

    public async Task AddAsync(Meeting meeting, CancellationToken ct = default)
    {
        await context.Meetings.AddAsync(meeting, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Meeting meeting, CancellationToken ct = default)
    {
        context.Meetings.Update(meeting);
        await context.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int meetingId, CancellationToken ct = default)
    {
        var meeting = await context.Meetings.FindAsync(new object[] { meetingId }, ct);
        if (meeting is not null)
        {
            context.Meetings.Remove(meeting);
            await context.SaveChangesAsync(ct);
        }
    }

    public async Task<MeetingAttendee?> GetAttendeeAsync(int meetingId, int userId, CancellationToken ct = default)
        => await context.MeetingAttendees
            .FirstOrDefaultAsync(a => a.MeetingId == meetingId && a.UserId == userId, ct);

    public async Task AddAttendeeAsync(MeetingAttendee attendee, CancellationToken ct = default)
    {
        await context.MeetingAttendees.AddAsync(attendee, ct);
        await context.SaveChangesAsync(ct);
    }

    public async Task UpdateAttendeeAsync(MeetingAttendee attendee, CancellationToken ct = default)
    {
        context.MeetingAttendees.Update(attendee);
        await context.SaveChangesAsync(ct);
    }

    public async Task RemoveAttendeeAsync(int meetingId, int userId, CancellationToken ct = default)
    {
        var attendee = await context.MeetingAttendees
            .FirstOrDefaultAsync(a => a.MeetingId == meetingId && a.UserId == userId, ct);
        if (attendee is not null)
        {
            context.MeetingAttendees.Remove(attendee);
            await context.SaveChangesAsync(ct);
        }
    }
}
