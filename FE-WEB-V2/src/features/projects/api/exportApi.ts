// MOCK — see MOCK_API_TODO.md. Real endpoints return a binary file stream
// (GET /projects/{projectId}/export/xlsx | /pdf) — mock triggers a placeholder text download
// so the button is clickable/demoable without a real file generator.
import { mockDelay } from "../../../core/api/mock";

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportApi = {
  downloadXlsx: async (projectId: number, projectName: string) => {
    await mockDelay(undefined, 600);
    const filename = `project_${projectId}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx.txt`;
    triggerDownload(filename, `[MOCK] Would export "${projectName}" (project #${projectId}) as .xlsx.\nReal endpoint: GET /api/projects/${projectId}/export/xlsx`, "text/plain");
  }, // TODO: GET /projects/{projectId}/export/xlsx

  downloadPdf: async (projectId: number, projectName: string) => {
    await mockDelay(undefined, 600);
    const filename = `project_${projectId}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf.txt`;
    triggerDownload(filename, `[MOCK] Would export "${projectName}" (project #${projectId}) as .pdf.\nReal endpoint: GET /api/projects/${projectId}/export/pdf`, "text/plain");
  }, // TODO: GET /projects/{projectId}/export/pdf
};
