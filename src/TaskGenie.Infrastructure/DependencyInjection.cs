using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.ExternalServices;
using TaskGenie.Infrastructure.Persistence;
using TaskGenie.Infrastructure.Persistence.Repositories;

namespace TaskGenie.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IAiRecommendationRepository, AiRecommendationRepository>();
        services.AddScoped<ITaskEmbeddingRepository, TaskEmbeddingRepository>();
        services.AddScoped<ITaskLogRepository, TaskLogRepository>();
        services.AddScoped<IAiAnalysisRepository, AiAnalysisRepository>();
        services.AddScoped<IOrganizationRepository, OrganizationRepository>();
        services.AddScoped<IProjectEvaluationRepository, ProjectEvaluationRepository>();
        services.AddScoped<IProjectRepository, ProjectRepository>();
        services.AddScoped<ITeamRepository, TeamRepository>();
        services.AddScoped<ITeamMemberRepository, TeamMemberRepository>();
        services.AddScoped<ISkillRepository, SkillRepository>();
        services.AddScoped<IUserSkillRepository, UserSkillRepository>();
        services.AddScoped<IEvaluationRepository, EvaluationRepository>();
        services.AddScoped<IInvitationRepository, InvitationRepository>();
        services.AddScoped<IActivityLogRepository, ActivityLogRepository>();
        services.AddScoped<ITaskCommentRepository, TaskCommentRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<ITaskRequiredSkillRepository, TaskRequiredSkillRepository>();
        services.AddScoped<ITaskStatsRepository, TaskStatsRepository>();
        services.AddScoped<ITaskDependencyRepository, TaskDependencyRepository>();

        // External Services
        services.AddHttpClient<IHuggingFaceService, HuggingFaceService>();
        services.AddHttpClient<ITextGenerationService, TextGenerationService>();
        services.AddHttpClient<IClassificationService, ClassificationService>();
        services.AddSingleton<ICloudinaryService, CloudinaryService>();
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();

        return services;
    }
}
