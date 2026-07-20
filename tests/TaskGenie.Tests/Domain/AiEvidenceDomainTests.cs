using TaskGenie.Domain.Entities;
using TaskEntity = TaskGenie.Domain.Entities.Task;

namespace TaskGenie.Tests.Domain;

public sealed class AiEvidenceDomainTests
{
    [Fact]
    public void TaskEvidence_RequiresAttachmentOrUrl() =>
        Assert.Throws<ArgumentException>(() => TaskEvidence.Create(1, 2, "LINK", null));

    [Theory]
    [InlineData("relative/path")]
    [InlineData("ftp://example.com/file")]
    [InlineData("javascript:alert(1)")]
    public void TaskEvidence_RejectsUnsafeOrRelativeUrls(string url) =>
        Assert.Throws<ArgumentException>(() => TaskEvidence.Create(1, 2, "LINK", null, externalUrl: url));

    [Fact]
    public void TaskEvidence_AcceptsHttpsUrl()
    {
        var evidence = TaskEvidence.Create(1, 2, "demo", "Screenshot", externalUrl: "https://example.com/evidence/1");

        Assert.Equal("DEMO", evidence.EvidenceType);
        Assert.Equal("https://example.com/evidence/1", evidence.ExternalUrl);
    }

    [Fact]
    public void Attachment_RejectsNegativeSize() =>
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            Attachment.Create(1, "proof.pdf", "application/pdf", -1, "https://cdn/proof.pdf", null, 2));

    [Fact]
    public void Recommendation_RecordsAcceptDecision()
    {
        var recommendation = AiRecommendation.Create(1, 2, 91, "Best match", rank: 1);

        recommendation.RecordDecision(true, 7, "Delivered on time");

        Assert.Equal("ACCEPTED", recommendation.Status);
        Assert.Equal(7, recommendation.DecidedBy);
        Assert.NotNull(recommendation.DecidedAt);
        Assert.Equal("Delivered on time", recommendation.Outcome);
    }

    [Fact]
    public void Task_SetRiskAssessment_NormalizesLevel()
    {
        var task = TaskEntity.Create(1, "Task", null);

        task.SetRiskAssessment("critical");

        Assert.Equal("CRITICAL", task.RiskLevel);
    }

    [Fact]
    public void RiskRule_RejectsInvalidWeight() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => RiskRule.Create("x", "X", "X", 1.1, "rule", "v1"));
}
