using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IMeetingRepository
{
    System.Threading.Tasks.Task<Meeting?> GetByIdAsync(int meetingId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Meeting>> GetByProjectIdAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Meeting>> GetUpcomingByProjectAsync(int projectId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Meeting>> GetByUserIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Meeting meeting, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Meeting meeting, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int meetingId, CancellationToken ct = default);

    System.Threading.Tasks.Task<MeetingAttendee?> GetAttendeeAsync(int meetingId, int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAttendeeAsync(MeetingAttendee attendee, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAttendeeAsync(MeetingAttendee attendee, CancellationToken ct = default);
    System.Threading.Tasks.Task RemoveAttendeeAsync(int meetingId, int userId, CancellationToken ct = default);
}
