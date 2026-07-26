import React, { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportApi } from "../api/exportApi";

interface ExportButtonsProps {
  projectId: number;
  projectName: string;
}

export function ExportButtons({ projectId, projectName }: ExportButtonsProps) {
  const [pending, setPending] = useState<"xlsx" | "pdf" | null>(null);

  const handle = async (kind: "xlsx" | "pdf") => {
    setPending(kind);
    try {
      if (kind === "xlsx") await exportApi.downloadXlsx(projectId, projectName);
      else await exportApi.downloadPdf(projectId, projectName);
      toast.success(`Exported ${kind.toUpperCase()} (mock file).`);
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Download size={14} /> Export
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => handle("xlsx")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <FileSpreadsheet size={13} /> {pending === "xlsx" ? "Exporting..." : "Export XLSX"}
        </button>
        <button
          onClick={() => handle("pdf")}
          disabled={pending !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          <FileText size={13} /> {pending === "pdf" ? "Exporting..." : "Export PDF"}
        </button>
      </div>
    </div>
  );
}
