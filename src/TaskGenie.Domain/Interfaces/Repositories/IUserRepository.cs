using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IUserRepository
{
    System.Threading.Tasks.Task<User?> GetByIdAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<User>> GetAllAsync(CancellationToken ct = default);
    System.Threading.Tasks.Task<List<User>> GetByTeamIdAsync(int teamId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<UserSkill>> GetUserSkillsAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<UserAvailability>> GetUserAvailabilityAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Evaluation>> GetUserEvaluationsAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<int> CountActiveTasksByUserAsync(int userId, CancellationToken ct = default);
    System.Threading.Tasks.Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>
    /// Finds an account regardless of whether it is suspended. Sign-in needs this: the normal lookup
    /// hides inactive rows, so a banned person was told their password was wrong and had no way to
    /// learn otherwise. Callers must still verify the password before revealing anything.
    /// </summary>
    System.Threading.Tasks.Task<User?> GetByEmailIncludingSuspendedAsync(string email, CancellationToken ct = default);
    System.Threading.Tasks.Task AddUserAsync(User user, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateUserAsync(User user, CancellationToken ct = default);
}
