import React from "react";
import { History, Loader2 } from "lucide-react";
import { useProjectActivity, useRecentActivity } from "../hooks/useActivityLogs";

interface ActivityFeedProps {
  projectId?: number;
  limit?: number;
  compact?: boolean;
}

function actionLabel(action: string | null) {
  return (action ?? "ACTIVITY").replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export function ActivityFeed({ projectId, limit = 20, compact }: ActivityFeedProps) {
  const projectFeed = useProjectActivity(projectId ?? null, limit);
  const globalFeed = useRecentActivity(limit);
  const { data: logs, isLoading } = projectId ? projectFeed : globalFeed;
  const list = compact ? (logs ?? []).slice(0, 5) : logs ?? [];

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <History size={14} /> Activity Log
      </h3>
      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
          <Loader2 className="animate-spin" size={13} /> Loading...
        </div>
      )}
      <div className="space-y-2">
        {list.map((log) => (
          <div key={log.logId} className="flex items-start gap-2 border-l-2 border-slate-200 pl-2.5 text-xs">
            <div className="flex-1">
              <span className="font-medium text-slate-800">{log.userName ?? "System"}</span>{" "}
              <span className="text-slate-500">{actionLabel(log.action)}</span>{" "}
              {log.entityType && <span className="text-slate-400">({log.entityType} #{log.entityId})</span>}
              <div className="text-[10px] text-slate-400">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</div>
            </div>
          </div>
        ))}
        {!isLoading && list.length === 0 && <p className="text-xs text-slate-400">No activity recorded yet.</p>}
      </div>
    </div>
  );
}
