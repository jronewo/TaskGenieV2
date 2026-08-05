using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace TaskGenie.Infrastructure.ExternalServices;

/// <summary>
/// Shared plumbing for the two things Gemini does for the assistant: choosing a skill, and turning
/// a question into a <see cref="Common.Agent.TaskQuery"/>. Both send a request body and parse a
/// response; only what goes in that body differs, so that is what each planner owns.
///
/// Credentials come from the runtime — the Cloud Run service account's metadata server in
/// production, ADC locally — so there is no key to leak into configuration or logs.
/// </summary>
public abstract class VertexAiClient
{
    /// <summary>
    /// Only this combination answers on this project: v1beta1, the un-prefixed host, and the
    /// "global" location — which is deliberately not the region Cloud Run runs in. Every regional
    /// endpoint tried (asia-southeast1, us-central1) returns 404 for every Gemini model, so this
    /// is not a preference to tune but the one address that exists.
    /// </summary>
    private const string DefaultEndpoint = "https://aiplatform.googleapis.com";
    private const string DefaultLocation = "global";
    private const string DefaultModel = "gemini-2.5-flash";

    private static readonly string[] Scopes = ["https://www.googleapis.com/auth/cloud-platform"];

    private readonly HttpClient _http;
    private readonly ILogger _logger;
    private readonly string _url;

    protected VertexAiClient(HttpClient http, IConfiguration configuration, ILogger logger)
    {
        _http = http;
        _logger = logger;

        var projectId = configuration["VertexAi:ProjectId"]
            ?? throw new InvalidOperationException(
                "VertexAi:ProjectId is not configured. The assistant needs it to address the model.");
        var location = configuration["VertexAi:Location"] ?? DefaultLocation;
        var model = configuration["VertexAi:Model"] ?? DefaultModel;
        var endpoint = configuration["VertexAi:Endpoint"] ?? DefaultEndpoint;

        _url = $"{endpoint}/v1beta1/projects/{projectId}/locations/{location}"
             + $"/publishers/google/models/{model}:generateContent";
    }

    protected async Task<JsonNode?> GenerateAsync(object request, CancellationToken ct)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, _url)
        {
            Content = JsonContent.Create(request),
        };
        httpRequest.Headers.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", await AccessTokenAsync(ct));

        using var response = await _http.SendAsync(httpRequest, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            // Logged, not thrown from here: each planner decides what an outage means for its reply.
            _logger.LogWarning(
                "Vertex AI refused the request ({Status}): {Body}", response.StatusCode, Trim(body));
            throw new SkillPlanningException($"Vertex AI trả về {(int)response.StatusCode}.");
        }

        return await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken: ct);
    }

    private static async Task<string> AccessTokenAsync(CancellationToken ct)
    {
        var credential = (await GoogleCredential.GetApplicationDefaultAsync(ct)).CreateScoped(Scopes);
        return await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: ct);
    }

    /// <summary>Provider errors can carry the whole request back; the log only needs the shape.</summary>
    private static string Trim(string body) => body.Length <= 500 ? body : body[..500] + "…";
}

/// <summary>Raised when Vertex AI could not be reached or refused the request.</summary>
public sealed class SkillPlanningException(string message) : Exception(message);
