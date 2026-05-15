using MediatR;
using TaskGenie.Application.Interfaces;
using TaskGenie.Domain.Entities;
using TaskGenie.Domain.Interfaces.Repositories;

namespace TaskGenie.Application.Features.AI.Commands;

public sealed record ClassifyTaskCommand(int TaskId) : IRequest<bool>;

public sealed class ClassifyTaskCommandHandler(
    ITaskRepository taskRepo,
    IAiAnalysisRepository aiAnalysisRepo,
    IClassificationService classificationService
) : IRequestHandler<ClassifyTaskCommand, bool>
{
    private static readonly string[] TypeLabels = ["frontend", "backend", "devops"];
    private static readonly string[] DifficultyLabels = ["easy", "medium", "hard"];

    public async Task<bool> Handle(ClassifyTaskCommand cmd, CancellationToken ct)
    {
        var task = await taskRepo.GetByIdAsync(cmd.TaskId, ct);
        if (task is null) return false;

        var text = $"Task: {task.Title}. Description: {task.Description}";

        string content;
        try
        {
            var typeScores = await classificationService.ClassifyZeroShotAsync(text, TypeLabels);
            var bestType = typeScores.OrderByDescending(x => x.Score).FirstOrDefault();

            var difficultyScores = await classificationService.ClassifyZeroShotAsync(text, DifficultyLabels);
            var bestDifficulty = difficultyScores.OrderByDescending(x => x.Score).FirstOrDefault();

            content = $"Task classified as Type: {bestType?.Label ?? "unknown"} ({bestType?.Score:P1}), " +
                      $"Difficulty: {bestDifficulty?.Label ?? "unknown"} ({bestDifficulty?.Score:P1}).";
        }
        catch
        {
            content = $"Classification unavailable (AI service unreachable). Task: {task.Title}.";
        }

        var analysis = AiAnalysis.Create(cmd.TaskId, "classification", content);
        await aiAnalysisRepo.AddAsync(analysis, ct);

        return true;
    }
}
