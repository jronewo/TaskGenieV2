import React, { useState } from "react";
import { History } from "lucide-react";
import { useProjects } from "../../projects/hooks/useProjects";
import { ActivityFeed } from "../components/ActivityFeed";

export default function ActivityLogPage() {
  const { data: projects } = useProjects();
  const [projectId, setProjectId] = useState<number | "">("");

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
            <History size={12} /> Activity Log
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Audit trail across your workspace</h2>
          <p className="mt-1 text-sm text-slate-500">Automatically recorded from task and project events.</p>
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value === "" ? "" : Number(e.target.value))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none bg-input-background"
        >
          <option value="">All activity</option>
          {(projects ?? []).map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <ActivityFeed projectId={projectId === "" ? undefined : projectId} limit={100} />
      </div>
    </div>
  );
}
