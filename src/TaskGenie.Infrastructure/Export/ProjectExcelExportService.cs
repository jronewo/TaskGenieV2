using ClosedXML.Excel;
using TaskGenie.Application.Features.Export;

namespace TaskGenie.Infrastructure.Export;

public partial class ProjectExportService
{
    public byte[] ExportToExcel(ProjectExportData data)
    {
        using var wb = new XLWorkbook();

        AddOverviewSheet(wb, data);
        AddTasksSheet(wb, data);
        AddMembersSheet(wb, data);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    // ── Sheet 1: Tổng quan ─────────────────────────────────────────────────
    private static void AddOverviewSheet(XLWorkbook wb, ProjectExportData data)
    {
        var ws = wb.Worksheets.Add("Tổng quan");
        ws.Column(1).Width = 26;
        ws.Column(2).Width = 40;

        int row = 1;

        // Title
        ws.Cell(row, 1).Value = $"BÁO CÁO DỰ ÁN: {data.ProjectName.ToUpperInvariant()}";
        var titleRange = ws.Range(row, 1, row, 2);
        titleRange.Merge();
        titleRange.Style
            .Font.SetBold(true)
            .Font.SetFontSize(14)
            .Fill.SetBackgroundColor(XLColor.FromHtml("#1F3864"))
            .Font.SetFontColor(XLColor.White)
            .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        row += 2;

        // Info rows
        var info = new (string Label, string Value)[]
        {
            ("Tên dự án",      data.ProjectName),
            ("Mô tả",          data.Description ?? "—"),
            ("Trạng thái",     data.Status ?? "—"),
            ("Tổ chức",        data.OrganizationName ?? "—"),
            ("Team",           data.TeamName ?? "—"),
            ("Deadline",       data.Deadline?.ToString("dd/MM/yyyy") ?? "—"),
            ("Ngày xuất báo cáo", data.ExportedAt.ToString("dd/MM/yyyy HH:mm") + " UTC"),
        };

        foreach (var (label, value) in info)
        {
            ws.Cell(row, 1).Value = label;
            ws.Cell(row, 1).Style.Font.SetBold(true).Fill.SetBackgroundColor(XLColor.FromHtml("#D9E1F2"));
            ws.Cell(row, 2).Value = value;
            row++;
        }

        row += 2;

        // Stats header
        ws.Cell(row, 1).Value = "THỐNG KÊ TASKS";
        var statsHeader = ws.Range(row, 1, row, 2);
        statsHeader.Merge();
        statsHeader.Style.Font.SetBold(true).Fill.SetBackgroundColor(XLColor.FromHtml("#2E75B6")).Font.SetFontColor(XLColor.White);
        row++;

        var stats = new (string Label, string Value)[]
        {
            ("Tổng số tasks",         data.TotalTasks.ToString()),
            ("Hoàn thành (Done)",     data.DoneTasks.ToString()),
            ("Đang thực hiện",        data.InProgressTasks.ToString()),
            ("Chưa bắt đầu (Todo)",  data.TodoTasks.ToString()),
            ("Tỉ lệ hoàn thành đúng hạn", $"{data.OnTimeTaskRate}%"),
        };

        foreach (var (label, value) in stats)
        {
            ws.Cell(row, 1).Value = label;
            ws.Cell(row, 1).Style.Font.SetBold(true).Fill.SetBackgroundColor(XLColor.FromHtml("#DDEBF7"));
            ws.Cell(row, 2).Value = value;
            row++;
        }

        ws.SheetView.FreezeRows(1);
    }

    // ── Sheet 2: Danh sách Tasks ───────────────────────────────────────────
    private static void AddTasksSheet(XLWorkbook wb, ProjectExportData data)
    {
        var ws = wb.Worksheets.Add("Danh sách Tasks");

        string[] headers =
        [
            "#", "Tiêu đề", "Trạng thái", "Ưu tiên", "Độ khó",
            "Deadline", "Tiến độ (%)", "Thời gian ước tính (h)", "Thời gian thực tế (h)",
            "Hoàn thành lúc", "Đúng/Trễ hạn", "Số ngày (+ sớm / - trễ)", "Người thực hiện"
        ];

        // Header row
        for (int c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style
                .Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1F3864"))
                .Font.SetFontColor(XLColor.White)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        }

        // Data rows
        for (int i = 0; i < data.Tasks.Count; i++)
        {
            var t = data.Tasks[i];
            int row = i + 2;
            bool isEven = i % 2 == 1;
            var bg = isEven ? XLColor.FromHtml("#DEEAF1") : XLColor.White;

            ws.Cell(row, 1).Value  = t.No;
            ws.Cell(row, 2).Value  = t.Title;
            ws.Cell(row, 3).Value  = t.Status;
            ws.Cell(row, 4).Value  = t.Priority;
            ws.Cell(row, 5).Value  = t.Difficulty.HasValue ? $"{t.Difficulty}/5" : "—";
            ws.Cell(row, 6).Value  = t.Deadline?.ToString("dd/MM/yyyy") ?? "—";
            ws.Cell(row, 7).Value  = t.Progress.HasValue ? $"{t.Progress}%" : "—";
            ws.Cell(row, 8).Value  = t.EstimatedTime?.ToString() ?? "—";
            ws.Cell(row, 9).Value  = t.ActualTime?.ToString() ?? "—";
            ws.Cell(row, 10).Value = t.CompletedAt?.ToString("dd/MM/yyyy HH:mm") ?? "—";
            ws.Cell(row, 11).Value = t.IsLate == null ? "—" : (t.IsLate.Value ? "TRỄ" : "ĐÚG HẠN");
            ws.Cell(row, 12).Value = t.DaysLateOrEarly.HasValue ? t.DaysLateOrEarly.Value.ToString() : "—";
            ws.Cell(row, 13).Value = t.Assignees;

            // Colour the status cell
            var statusColor = t.Status switch
            {
                "Done"       => XLColor.FromHtml("#C6EFCE"),
                "InProgress" => XLColor.FromHtml("#FFEB9C"),
                _            => XLColor.FromHtml("#FFCCCC")
            };
            ws.Cell(row, 3).Style.Fill.SetBackgroundColor(statusColor);

            // Colour the on-time cell
            if (t.IsLate == true)
                ws.Cell(row, 11).Style.Fill.SetBackgroundColor(XLColor.FromHtml("#FFC7CE"))
                    .Font.SetFontColor(XLColor.FromHtml("#9C0006"));
            else if (t.IsLate == false)
                ws.Cell(row, 11).Style.Fill.SetBackgroundColor(XLColor.FromHtml("#C6EFCE"))
                    .Font.SetFontColor(XLColor.FromHtml("#276221"));

            // Row background
            for (int c = 1; c <= headers.Length; c++)
            {
                if (c != 3 && c != 11)
                    ws.Cell(row, c).Style.Fill.SetBackgroundColor(bg);
            }
        }

        // Auto-fit columns
        int[] autoFitCols = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        foreach (int c in autoFitCols) ws.Column(c).AdjustToContents();
        ws.Column(2).Width  = 35;
        ws.Column(13).Width = 30;

        ws.SheetView.FreezeRows(1);
        ws.RangeUsed()?.SetAutoFilter();
    }

    // ── Sheet 3: Điểm thành viên ─────────────────────────────────────────
    private static void AddMembersSheet(XLWorkbook wb, ProjectExportData data)
    {
        var ws = wb.Worksheets.Add("Điểm thành viên");

        string[] headers = ["#", "Thành viên", "Điểm dự án", "Level", "Tasks hoàn thành", "Tasks trễ hạn"];

        for (int c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style
                .Font.SetBold(true)
                .Fill.SetBackgroundColor(XLColor.FromHtml("#1F3864"))
                .Font.SetFontColor(XLColor.White)
                .Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
        }

        for (int i = 0; i < data.Members.Count; i++)
        {
            var m = data.Members[i];
            int row = i + 2;
            bool isEven = i % 2 == 1;
            var bg = isEven ? XLColor.FromHtml("#DEEAF1") : XLColor.White;

            ws.Cell(row, 1).Value = m.No;
            ws.Cell(row, 2).Value = m.UserName;
            ws.Cell(row, 3).Value = m.TotalProjectScore;
            ws.Cell(row, 4).Value = m.Level;
            ws.Cell(row, 5).Value = m.CompletedTasks;
            ws.Cell(row, 6).Value = m.LateTasks;

            var scoreColor = m.TotalProjectScore >= 0
                ? XLColor.FromHtml("#C6EFCE") : XLColor.FromHtml("#FFC7CE");
            ws.Cell(row, 3).Style.Fill.SetBackgroundColor(scoreColor);

            for (int c = 1; c <= headers.Length; c++)
                if (c != 3)
                    ws.Cell(row, c).Style.Fill.SetBackgroundColor(bg);
        }

        foreach (int c in Enumerable.Range(1, headers.Length)) ws.Column(c).AdjustToContents();
        ws.Column(2).Width = 25;

        ws.SheetView.FreezeRows(1);
    }
}
