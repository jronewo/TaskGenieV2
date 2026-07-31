using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TaskGenie.Application.Features.Export;

namespace TaskGenie.Infrastructure.Export;

public partial class ProjectExportService
{
    private static readonly string HeaderBlue = "#1F3864";
    private static readonly string LightBlue  = "#DEEAF1";
    private static readonly string Green      = "#C6EFCE";
    private static readonly string Red        = "#FFC7CE";
    private static readonly string Yellow     = "#FFEB9C";

    public byte[] ExportToPdf(ProjectExportData data)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                page.Header().Element(c => BuildHeader(c, data));
                page.Content().Element(c => BuildContent(c, data));
                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("TaskGenie — Exported ").FontColor(Colors.Grey.Medium);
                    t.Span(data.ExportedAt.ToString("dd/MM/yyyy HH:mm")).FontColor(Colors.Grey.Medium);
                    t.Span("  |  Trang ").FontColor(Colors.Grey.Medium);
                    t.CurrentPageNumber().FontColor(Colors.Grey.Medium);
                    t.Span("/").FontColor(Colors.Grey.Medium);
                    t.TotalPages().FontColor(Colors.Grey.Medium);
                });
            });
        });

        using var ms = new MemoryStream();
        document.GeneratePdf(ms);
        return ms.ToArray();
    }

    // ── Header ────────────────────────────────────────────────────────────────
    private static void BuildHeader(IContainer c, ProjectExportData data)
    {
        c.Column(col =>
        {
            col.Item().Background(HeaderBlue).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(inner =>
                {
                    inner.Item().Text(data.ProjectName.ToUpperInvariant())
                        .FontSize(16).Bold().FontColor(Colors.White);
                    inner.Item().Text($"{data.OrganizationName ?? "—"}  •  Team: {data.TeamName ?? "—"}")
                        .FontSize(9).FontColor(Colors.White);
                });
                row.ConstantItem(200).Column(inner =>
                {
                    inner.Item().AlignRight().Text($"Trạng thái: {data.Status ?? "—"}")
                        .FontSize(9).FontColor(Colors.White);
                    inner.Item().AlignRight().Text($"Deadline: {data.Deadline?.ToString("dd/MM/yyyy") ?? "—"}")
                        .FontSize(9).FontColor(Colors.White);
                    inner.Item().AlignRight().Text($"Xuất: {data.ExportedAt:dd/MM/yyyy HH:mm} UTC")
                        .FontSize(9).FontColor(Colors.White);
                });
            });

            // Stats bar
            col.Item().Background(LightBlue).Padding(6).Row(row =>
            {
                StatBox(row, "Tổng tasks",        data.TotalTasks.ToString());
                StatBox(row, "Hoàn thành",        data.DoneTasks.ToString(),    Green);
                StatBox(row, "Đang thực hiện",    data.InProgressTasks.ToString(), Yellow);
                StatBox(row, "Chưa bắt đầu",      data.TodoTasks.ToString(),    Red);
                StatBox(row, "Đúng hạn",          $"{data.OnTimeTaskRate}%",    Green);
            });

            col.Item().Height(6);
        });
    }

    private static void StatBox(RowDescriptor row, string label, string value, string? bg = null)
    {
        row.RelativeItem().Background(bg ?? "#E9EFF7").Padding(6).Column(c =>
        {
            c.Item().Text(label).FontSize(7).FontColor(Colors.Grey.Darken2);
            c.Item().Text(value).FontSize(13).Bold();
        });
        row.ConstantItem(4);
    }

    // ── Content ───────────────────────────────────────────────────────────────
    private static void BuildContent(IContainer c, ProjectExportData data)
    {
        c.Column(col =>
        {
            col.Item().Element(x => BuildTaskTable(x, data));
            col.Item().Height(12);
            col.Item().Element(x => BuildMembersTable(x, data));
        });
    }

    // ── Task Table ────────────────────────────────────────────────────────────
    private static void BuildTaskTable(IContainer c, ProjectExportData data)
    {
        c.Column(col =>
        {
            col.Item().Background(HeaderBlue).Padding(5)
                .Text("DANH SÁCH TASKS").Bold().FontColor(Colors.White).FontSize(10);

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(22);   // #
                    cols.RelativeColumn(3);    // Tiêu đề
                    cols.RelativeColumn(1.2f); // Trạng thái
                    cols.RelativeColumn(1);    // Ưu tiên
                    cols.ConstantColumn(40);   // Độ khó
                    cols.ConstantColumn(60);   // Deadline
                    cols.ConstantColumn(42);   // Tiến độ
                    cols.ConstantColumn(42);   // Est.
                    cols.ConstantColumn(42);   // Actual
                    cols.ConstantColumn(82);   // Hoàn thành lúc
                    cols.ConstantColumn(55);   // Đúng/Trễ
                    cols.RelativeColumn(2);    // Người thực hiện
                });

                // Header
                string[] taskHeaders = ["#", "Tiêu đề", "Trạng thái", "Ưu tiên", "Khó", "Deadline",
                    "Tiến độ", "Est.(h)", "Act.(h)", "Hoàn thành", "Hạn", "Người thực hiện"];
                table.Header(h =>
                {
                    foreach (var label in taskHeaders)
                        h.Cell().Background("#2E75B6").Padding(4).AlignCenter()
                            .Text(label).Bold().FontColor(Colors.White).FontSize(8);
                });

                // Rows
                foreach (var t in data.Tasks)
                {
                    bool even = t.No % 2 == 0;
                    string rowBg = even ? LightBlue : Colors.White;

                    string statusBg = t.Status switch
                    {
                        "Done"       => Green,
                        "InProgress" => Yellow,
                        _            => Red
                    };

                    string lateBg = t.IsLate == null ? rowBg
                        : t.IsLate.Value ? Red : Green;

                    string lateText = t.IsLate == null ? "—"
                        : t.IsLate.Value
                            ? $"TRỄ {Math.Abs(t.DaysLateOrEarly ?? 0)}n"
                            : t.DaysLateOrEarly > 0
                                ? $"SỚM {t.DaysLateOrEarly}n"
                                : "ĐÚNG HẠN";

                    TaskCell(table, t.No.ToString(),   rowBg, center: true);
                    TaskCell(table, t.Title,           rowBg);
                    TaskCell(table, t.Status ?? "—",   statusBg, center: true, bold: true);
                    TaskCell(table, t.Priority ?? "—", rowBg, center: true);
                    TaskCell(table, t.Difficulty.HasValue ? $"{t.Difficulty}/5" : "—", rowBg, center: true);
                    TaskCell(table, t.Deadline?.ToString("dd/MM/yy") ?? "—", rowBg, center: true);
                    TaskCell(table, t.Progress.HasValue ? $"{t.Progress}%" : "—", rowBg, center: true);
                    TaskCell(table, t.EstimatedTime?.ToString() ?? "—", rowBg, center: true);
                    TaskCell(table, t.ActualTime?.ToString() ?? "—", rowBg, center: true);
                    TaskCell(table, t.CompletedAt?.ToString("dd/MM/yy HH:mm") ?? "—", rowBg, center: true);
                    TaskCell(table, lateText, lateBg, center: true, bold: t.IsLate != null);
                    TaskCell(table, t.Assignees, rowBg);
                }
            });
        });
    }

    private static void TaskCell(TableDescriptor table, string text, string bg,
        bool center = false, bool bold = false)
    {
        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
            .Padding(3).Element(x =>
            {
                var aligned = center ? x.AlignCenter() : x.AlignLeft();
                var t = aligned.Text(text).FontSize(8);
                if (bold) t.Bold();
            });
    }

    // ── Members Table ──────────────────────────────────────────────────────────
    private static void BuildMembersTable(IContainer c, ProjectExportData data)
    {
        c.Column(col =>
        {
            col.Item().Background(HeaderBlue).Padding(5)
                .Text("ĐIỂM THÀNH VIÊN").Bold().FontColor(Colors.White).FontSize(10);

            col.Item().Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.ConstantColumn(25);
                    cols.RelativeColumn(2);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                    cols.RelativeColumn(1);
                });

                table.Header(h =>
                {
                    foreach (var lbl in new[] { "#", "Thành viên", "Điểm dự án", "Level", "Tasks xong", "Tasks trễ" })
                    {
                        h.Cell().Background("#2E75B6").Padding(4).AlignCenter()
                            .Text(lbl).Bold().FontColor(Colors.White).FontSize(8);
                    }
                });

                foreach (var m in data.Members)
                {
                    bool even = m.No % 2 == 0;
                    string rowBg = even ? LightBlue : Colors.White;
                    string scoreBg = m.TotalProjectScore >= 0 ? Green : Red;

                    MemberCell(table, m.No.ToString(), rowBg, center: true);
                    MemberCell(table, m.UserName, rowBg);
                    MemberCell(table, m.TotalProjectScore.ToString("+#;-#;0"), scoreBg, center: true, bold: true);
                    MemberCell(table, m.Level, rowBg, center: true);
                    MemberCell(table, m.CompletedTasks.ToString(), rowBg, center: true);
                    MemberCell(table, m.LateTasks.ToString(), m.LateTasks > 0 ? Red : rowBg, center: true);
                }
            });
        });
    }

    private static void MemberCell(TableDescriptor table, string text, string bg,
        bool center = false, bool bold = false)
    {
        table.Cell().Background(bg).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2)
            .Padding(4).Element(x =>
            {
                var aligned = center ? x.AlignCenter() : x.AlignLeft();
                var t = aligned.Text(text).FontSize(9);
                if (bold) t.Bold();
            });
    }
}
