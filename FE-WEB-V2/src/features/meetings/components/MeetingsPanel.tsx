import React, { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Calendar, Check, Clock, Loader2, MapPin, Plus, Trash2, UserPlus, X } from "lucide-react";
import { ApiError } from "../../../core/api/client";
import { useAuth } from "../../../core/auth/AuthContext";
import { useProjects } from "../../projects/hooks/useProjects";
import { useMyMeetings, useProjectMeetings, useCreateMeeting, useDeleteMeeting, useAddAttendee, useUpdateAttendeeStatus } from "../hooks/useMeetings";
import { MeetingDto } from "../types";

interface MeetingsPanelProps {
  projectId?: number;
  compact?: boolean;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function MeetingCard({ meeting, onDelete }: { meeting: MeetingDto; onDelete: (id: number) => void }) {
  const { user } = useAuth();
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const addAttendee = useAddAttendee(meeting.projectId);
  const updateStatus = useUpdateAttendeeStatus(meeting.projectId);

  const myAttendance = meeting.attendees.find((a) => a.userId === user?.userId);

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeEmail.trim()) return;
    try {
      await addAttendee.mutateAsync({ meetingId: meeting.meetingId, email: attendeeEmail.trim() });
      setAttendeeEmail("");
      toast.success("Attendee added.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Thêm người tham dự thất bại.");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{meeting.title}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{meeting.status}</span>
          </div>
          {meeting.description && <p className="mt-1 text-xs text-slate-500">{meeting.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {formatDateTime(meeting.scheduledAt)}
            </span>
            {meeting.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {meeting.location}
              </span>
            )}
            {meeting.projectName && <span className="rounded bg-slate-100 px-1.5 py-0.5">{meeting.projectName}</span>}
          </div>
        </div>
        <button onClick={() => onDelete(meeting.meetingId)} className="text-slate-400 hover:text-rose-600">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {meeting.attendees.map((a) => (
          <span
            key={a.userId}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              a.status === "Accepted" ? "bg-emerald-50 text-emerald-700" : a.status === "Declined" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {a.userName ?? a.userEmail}
          </span>
        ))}
        <button onClick={() => setShowAttendeeForm((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-500 hover:border-slate-400">
          <UserPlus size={11} /> Add
        </button>
      </div>

      {showAttendeeForm && (
        <form onSubmit={handleAddAttendee} className="mt-2 flex gap-2">
          <input
            value={attendeeEmail}
            onChange={(e) => setAttendeeEmail(e.target.value)}
            placeholder="attendee@company.com"
            className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-slate-500"
          />
          <button type="submit" disabled={addAttendee.isPending} className="rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60">
            Add
          </button>
        </form>
      )}

      {myAttendance && myAttendance.status === "Pending" && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
          <span className="text-[11px] text-amber-800">You're invited — respond?</span>
          <button
            onClick={() => updateStatus.mutate({ meetingId: meeting.meetingId, userId: myAttendance.userId, status: "Accepted" })}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white"
          >
            <Check size={10} /> Accept
          </button>
          <button
            onClick={() => updateStatus.mutate({ meetingId: meeting.meetingId, userId: myAttendance.userId, status: "Declined" })}
            className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
          >
            <X size={10} /> Decline
          </button>
        </div>
      )}
    </div>
  );
}

export function MeetingsPanel({ projectId, compact }: MeetingsPanelProps) {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const allMeetings = useMyMeetings();
  const projectMeetings = useProjectMeetings(projectId ?? null);
  const { data: meetings, isLoading } = projectId ? projectMeetings : allMeetings;
  const createMeeting = useCreateMeeting();
  const deleteMeeting = useDeleteMeeting(projectId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduledAt: "", endAt: "", location: "", projectId: projectId ?? projects?.[0]?.projectId ?? 0 });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim() || !form.scheduledAt || !form.projectId) {
      toast.error("Vui lòng nhập tiêu đề, dự án và thời gian.");
      return;
    }
    try {
      await createMeeting.mutateAsync({
        projectId: form.projectId,
        organizedBy: user.userId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        location: form.location.trim() || undefined,
      });
      toast.success("Meeting scheduled.");
      setForm({ title: "", description: "", scheduledAt: "", endAt: "", location: "", projectId: projectId ?? projects?.[0]?.projectId ?? 0 });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Tạo cuộc họp thất bại.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMeeting.mutateAsync(id);
      toast.success("Meeting removed.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Xoá cuộc họp thất bại.");
    }
  };

  const list = compact ? (meetings ?? []).slice(0, 3) : meetings ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Calendar size={14} /> {projectId ? "Project Meetings" : "My Meetings"}
        </h3>
        <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
          <Plus size={13} /> Schedule
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          {!projectId && (
            <select
              value={form.projectId}
              onChange={(e) => setForm((p) => ({ ...p, projectId: Number(e.target.value) }))}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none bg-input-background"
            >
              {(projects ?? []).map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Meeting title"
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none" />
            <input type="datetime-local" value={form.endAt} onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none" />
          </div>
          <input
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="Location / link (optional)"
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={createMeeting.isPending} className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60">
              {createMeeting.isPending ? "Scheduling..." : "Schedule"}
            </button>
          </div>
        </motion.form>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={15} /> Loading meetings...
        </div>
      )}

      <div className="space-y-2.5">
        {list.map((m) => (
          <MeetingCard key={m.meetingId} meeting={m} onDelete={handleDelete} />
        ))}
        {!isLoading && list.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No meetings scheduled.</div>}
      </div>
    </div>
  );
}
