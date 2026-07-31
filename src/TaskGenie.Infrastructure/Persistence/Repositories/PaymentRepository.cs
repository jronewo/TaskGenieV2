using Microsoft.EntityFrameworkCore;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Persistence;
using Task = System.Threading.Tasks.Task;

namespace TaskGenie.Infrastructure.Persistence.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _context;

    public PaymentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Payment?> GetByIdAsync(int paymentId, CancellationToken ct = default)
    {
        return await _context.Payments
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId, ct);
    }

    public async Task<Payment?> GetByOrderCodeAsync(long orderCode, CancellationToken ct = default)
    {
        return await _context.Payments
            .FirstOrDefaultAsync(p => p.OrderCode == orderCode, ct);
    }

    public async Task<List<Payment>> GetByOrganizationIdAsync(int organizationId, CancellationToken ct = default)
    {
        return await _context.Payments
            .Where(p => p.OrganizationId == organizationId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task AddAsync(Payment payment, CancellationToken ct = default)
    {
        await _context.Payments.AddAsync(payment, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Payment payment, CancellationToken ct = default)
    {
        _context.Payments.Update(payment);
        await _context.SaveChangesAsync(ct);
    }
}
