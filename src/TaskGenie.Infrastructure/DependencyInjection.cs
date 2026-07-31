using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.Export;
using TaskGenie.Infrastructure.ExternalServices;
using TaskGenie.Infrastructure.Persistence;
using TaskGenie.Infrastructure.Persistence.Repositories;

namespace TaskGenie.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<PayOSOptions>(configuration.GetSection(PayOSOptions.SectionName));
        services.Configure<MomoOptions>(configuration.GetSection(MomoOptions.SectionName));
        services.Configure<AppUrlOptions>(configuration.GetSection(AppUrlOptions.SectionName));

        services.AddDbContext<AppDbContext>(options =>
        {
            if (configuration.GetValue<bool>("Database:UseInMemory"))
                options.UseInMemoryDatabase("TaskGenieDemo");
            else
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
        });

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
        services.AddScoped<IUserScoreRepository, UserScoreRepository>();
        services.AddScoped<ITaskRequiredSkillRepository, TaskRequiredSkillRepository>();
        services.AddScoped<ITaskStatsRepository, TaskStatsRepository>();
        services.AddScoped<ITaskDependencyRepository, TaskDependencyRepository>();
        services.AddScoped<IMeetingRepository, MeetingRepository>();
        services.AddScoped<IRiskRepository, RiskRepository>();
        services.AddScoped<IEvidenceRepository, EvidenceRepository>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();

        // External Services
        services.AddHttpClient<IHuggingFaceService, HuggingFaceService>();
        services.AddHttpClient<ITextGenerationService, TextGenerationService>();
        services.AddHttpClient<IClassificationService, ClassificationService>();
        services.AddHttpClient<IPayOSService, PayOSService>();
        services.AddHttpClient<IMomoService, MomoService>();
        services.AddSingleton<ICloudinaryService, CloudinaryService>();
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IProjectExportService, ProjectExportService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<ITokenRevocationService, InMemoryTokenRevocationService>();
        services.AddSingleton<TaskGenie.Application.Features.AI.Services.RiskScoringEngine>();
        services.AddSingleton<TaskGenie.Application.Features.AI.Services.AssignmentScoringEngine>();

        return services;
    }
}
