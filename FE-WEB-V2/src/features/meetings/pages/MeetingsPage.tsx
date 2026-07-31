import React from "react";
import { Calendar } from "lucide-react";
import { MeetingsPanel } from "../components/MeetingsPanel";

export default function MeetingsPage() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <Calendar size={12} /> Meetings
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Project meetings across your workspace</h2>
        <p className="mt-1 text-sm text-slate-500">Schedule meetings and manage attendees.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <MeetingsPanel />
      </div>
    </div>
  );
}
