using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface INotificationRepository
{
    System.Threading.Tasks.Task<List<Notification>> GetByUserIdAsync(int userId, int limit = 50, CancellationToken ct = default);
    System.Threading.Tasks.Task<int> GetUnreadCountAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Notification?> GetByIdAsync(int id, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Notification notification, CancellationToken ct = default);
    System.Threading.Tasks.Task MarkAsReadAsync(int notificationId, CancellationToken ct = default);
    System.Threading.Tasks.Task MarkAllAsReadAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task DeleteAsync(int notificationId, CancellationToken ct = default);
}
