using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TaskGenie.Infrastructure.Persistence;

/// <summary>
/// Supplies SQL Server metadata to EF Core tooling without relying on runtime secrets.
/// The connection is never opened while scaffolding a migration.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=TaskGenieDesignTime;Integrated Security=True;TrustServerCertificate=True")
            .Options;

        return new AppDbContext(options);
    }
}
