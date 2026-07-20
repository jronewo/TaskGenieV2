using TaskGenie.Application.Features.Export;

namespace TaskGenie.Application.Interfaces;

public interface IProjectExportService
{
    byte[] ExportToExcel(ProjectExportData data);
    byte[] ExportToPdf(ProjectExportData data);
}
