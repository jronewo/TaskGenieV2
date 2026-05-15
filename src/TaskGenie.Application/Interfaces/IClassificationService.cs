namespace TaskGenie.Application.Interfaces;

public interface IClassificationService
{
    Task<ClassificationScore[]> ClassifyZeroShotAsync(string text, string[] candidateLabels);
}

public record ClassificationScore(string Label, double Score);
