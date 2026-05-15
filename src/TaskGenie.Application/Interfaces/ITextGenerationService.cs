namespace TaskGenie.Application.Interfaces;

public interface ITextGenerationService
{
    Task<string> GenerateTextAsync(string prompt, int maxTokens = 200);
    Task<string> GenerateAssignmentReasonAsync(string taskDescription, string userProfile);
}
