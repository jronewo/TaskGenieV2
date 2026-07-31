using TaskGenie.Domain.Entities;

namespace TaskGenie.Domain.Interfaces.Repositories;

public interface IPaymentRepository
{
    System.Threading.Tasks.Task<Payment?> GetByIdAsync(int paymentId, CancellationToken ct = default);
    System.Threading.Tasks.Task<Payment?> GetByOrderCodeAsync(long orderCode, CancellationToken ct = default);
    System.Threading.Tasks.Task<List<Payment>> GetByOrganizationIdAsync(int organizationId, CancellationToken ct = default);
    System.Threading.Tasks.Task AddAsync(Payment payment, CancellationToken ct = default);
    System.Threading.Tasks.Task UpdateAsync(Payment payment, CancellationToken ct = default);
}
