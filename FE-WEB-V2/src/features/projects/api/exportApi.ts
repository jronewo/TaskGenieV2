import { apiClient } from "../../../core/api/client";

function triggerDownload(blob: Blob, filename: string) {
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
    const { blob, filename } = await apiClient.getBlob(`/projects/${projectId}/export/xlsx`);
    triggerDownload(blob, filename ?? `${projectName}.xlsx`);
  },

  downloadPdf: async (projectId: number, projectName: string) => {
    const { blob, filename } = await apiClient.getBlob(`/projects/${projectId}/export/pdf`);
    triggerDownload(blob, filename ?? `${projectName}.pdf`);
  },
};
