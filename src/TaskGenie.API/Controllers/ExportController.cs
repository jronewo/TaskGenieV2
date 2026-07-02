using MediatR;
using Microsoft.AspNetCore.Mvc;
using TaskGenie.Application.Features.Export;

namespace TaskGenie.API.Controllers;

[Route("api/projects/{projectId}/export")]
[ApiController]
public class ExportController(IMediator mediator) : ControllerBase
{
    /// <summary>Xuất báo cáo dự án ra file Excel (.xlsx)</summary>
    [HttpGet("xlsx")]
    public async Task<IActionResult> ExportExcel(int projectId)
    {
        var result = await mediator.Send(new ExportProjectQuery(projectId, "xlsx"));
        return File(result.Data, result.ContentType, result.FileName);
    }

    /// <summary>Xuất báo cáo dự án ra file PDF</summary>
    [HttpGet("pdf")]
    public async Task<IActionResult> ExportPdf(int projectId)
    {
        var result = await mediator.Send(new ExportProjectQuery(projectId, "pdf"));
        return File(result.Data, result.ContentType, result.FileName);
    }
}
