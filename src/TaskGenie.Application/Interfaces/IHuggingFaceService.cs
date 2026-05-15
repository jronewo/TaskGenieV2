namespace TaskGenie.Application.Interfaces;

public interface IHuggingFaceService
{
    Task<List<float[]>> GetEmbeddingsAsync(List<string> texts);
    Task<double> ComputeSimilarityAsync(string text1, string text2);
    Task<List<double>> ComputeSimilarityBatchAsync(string sourceText, List<string> targetTexts);
}
