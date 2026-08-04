using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TaskGenie.Application.Common.Agent;
using TaskGenie.Application.Common.Options;
using TaskGenie.Application.Features.Admin;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Interfaces.Repositories;
using TaskGenie.Infrastructure.BackgroundJobs;
using TaskGenie.Infrastructure.Export;
using TaskGenie.Infrastructure.ExternalServices;
using TaskGenie.Infrastructure.ExternalServices.PayOs;
using TaskGenie.Infrastructure.Persistence;
using TaskGenie.Infrastructure.Persistence.Repositories;
using TaskGenie.Infrastructure.Persistence.Services;

namespace TaskGenie.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration, string? environmentName = null)
    {
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        var isProductionEnvironment = string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase);

        services.Configure<PasswordResetSettings>(configuration.GetSection(PasswordResetSettings.SectionName));
        services.Configure<AppUrlSettings>(configuration.GetSection(AppUrlSettings.SectionName));

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
        services.AddScoped<ITaskTypeRepository, TaskTypeRepository>();
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
        services.AddScoped<IProjectLifecycleService, ProjectLifecycleService>();
        services.AddScoped<ITeamLifecycleService, TeamLifecycleService>();
        services.AddScoped<ITaskLifecycleService, TaskLifecycleService>();
        services.AddScoped<IOrganizationMemberRepository, OrganizationMemberRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IPlanRepository, PlanRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IPaymentTransactionRepository, PaymentTransactionRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();

        // External Services
        services.AddHttpClient<IHuggingFaceService, HuggingFaceService>();
        services.AddHttpClient<ITextGenerationService, TextGenerationService>();

        // The assistant answers from the database, not from a language model. See
        // RuleBasedProjectAgent for why the LLM-backed version was removed.
        services.AddScoped<IProjectAgent, RuleBasedProjectAgent>();
        services.AddHttpClient<IClassificationService, ClassificationService>();
        services.AddSingleton<ICloudinaryService, CloudinaryService>();
        services.AddScoped<IGoogleAuthService, GoogleAuthService>();
        services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<IProjectExportService, ProjectExportService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        // Real SMTP when configured, otherwise the logging stub. Production must not run on the
        // stub: a password reset that silently goes nowhere looks identical to one that worked.
        services.Configure<SmtpSettings>(configuration.GetSection(SmtpSettings.SectionName));
        var smtp = configuration.GetSection(SmtpSettings.SectionName).Get<SmtpSettings>() ?? new SmtpSettings();

        if (smtp.IsConfigured)
        {
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        }
        else if (isProductionEnvironment)
        {
            throw new InvalidOperationException(
                "Smtp:Host and Smtp:FromAddress must be configured in Production — "
                + "LoggingEmailSender does not deliver mail.");
        }
        else
        {
            services.AddScoped<IEmailSender, LoggingEmailSender>();
        }

        // Bound unconditionally: PayOsWebhookController must be able to verify a webhook signature
        // whenever PayOS credentials are present, independently of which IPaymentProvider currently
        // handles checkout (e.g. Testing/UAT can run FakePaymentProvider for checkout while still
        // exercising real PayOS webhook verification against sandbox credentials).
        services.Configure<PayOsOptions>(configuration.GetSection(PayOsOptions.SectionName));

        // Payment provider is environment-gated. The simulated gateway must never be reachable in
        // Production — fail fast at startup rather than silently exposing fake checkout.
        var isProduction = string.Equals(environmentName, "Production", StringComparison.OrdinalIgnoreCase);
        var useFakePayments = configuration.GetValue("Payments:UseFakeProvider", !isProduction);

        if (useFakePayments && isProduction)
            throw new InvalidOperationException(
                "FakePaymentProvider cannot be enabled in Production. Configure a real IPaymentProvider.");

        if (useFakePayments)
        {
            services.AddScoped<IPaymentProvider, FakePaymentProvider>();
        }
        else
        {
            var payOsOptions = configuration.GetSection(PayOsOptions.SectionName).Get<PayOsOptions>() ?? new PayOsOptions();
            if (!payOsOptions.IsConfigured)
                throw new InvalidOperationException(
                    "Payments:UseFakeProvider is false but PayOS:ClientId/ApiKey/ChecksumKey are not configured. "
                    + "Set them via user-secrets or environment variables before starting this environment.");

            services.AddHttpClient<IPaymentProvider, PayOsPaymentProvider>(client =>
            {
                client.BaseAddress = new Uri(payOsOptions.ApiBaseUrl);
            });
        }

        // Scheduled maintenance. Both are plain BackgroundServices on a timer rather than a job
        // framework — the schedules are "check the clock hourly", which needs no job store.
        //
        // Never started under Testing: an integration test owns its database, and a sweep firing
        // mid-test would expire subscriptions or rewrite risk levels underneath the assertions.
        // Tests that cover the sweeps drive RunOnceAsync directly instead.
        services.Configure<SubscriptionLifecycleOptions>(configuration.GetSection(SubscriptionLifecycleOptions.SectionName));
        services.Configure<RiskAutomationOptions>(configuration.GetSection(RiskAutomationOptions.SectionName));

        var isTestEnvironment = string.Equals(environmentName, "Testing", StringComparison.OrdinalIgnoreCase);
        if (!isTestEnvironment)
        {
            services.AddHostedService<SubscriptionLifecycleWorker>();
            services.AddHostedService<RiskAutomationWorker>();
        }

        services.AddSingleton<ITokenRevocationService, InMemoryTokenRevocationService>();
        services.AddSingleton<TaskGenie.Application.Features.AI.Services.RiskScoringEngine>();
        services.AddSingleton<TaskGenie.Application.Features.AI.Services.AssignmentScoringEngine>();

        return services;
    }
}
