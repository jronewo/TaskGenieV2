using System.Net;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TaskGenie.Infrastructure.ExternalServices;

namespace TaskGenie.Tests.Infrastructure;

public sealed class TextGenerationServiceTests
{
    [Fact]
    public async Task GenerateTextAsync_UsesOpenAiCompatibleRouterAndParsesContent()
    {
        var handler = new RecordingHandler();
        using var client = new HttpClient(handler);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["HuggingFace:ApiKey"] = "test-token",
                ["HuggingFace:TextGenerationModelId"] = "test/model:provider"
            })
            .Build();
        var service = new TextGenerationService(
            client,
            configuration,
            NullLogger<TextGenerationService>.Instance);

        var result = await service.GenerateTextAsync("Explain the task risk", maxTokens: 25);

        Assert.Equal("Generated risk explanation", result);
        Assert.Equal(
            new Uri("https://router.huggingface.co/v1/chat/completions"),
            handler.RequestUri);
        Assert.Contains("\"model\":\"test/model:provider\"", handler.RequestBody);
        Assert.Contains("\"max_tokens\":25", handler.RequestBody);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }
        public string RequestBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            RequestBody = await request.Content!.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    "{\"choices\":[{\"message\":{\"content\":\"Generated risk explanation\"}}]}",
                    Encoding.UTF8,
                    "application/json")
            };
        }
    }
}
