import React, { useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Sparkles, Star } from "lucide-react";
import { useMyOrganization, useEvaluateProject, useProjectEvaluation } from "../hooks/useOrganizations";
import { OrganizationProjectDto } from "../types";
import { ApiError } from "../../../core/api/client";

const NOT_FOUND_MESSAGE = "You don't own an organization yet — this page is for organization owners managing their delivery teams' projects.";

const riskBadge = (riskLevel: string) => {
  if (riskLevel === "HIGH" || riskLevel === "CRITICAL") return "bg-red-100 text-red-700 border-red-200";
  if (riskLevel === "MEDIUM") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

function EvaluateForm({ orgId, project, onDone }: { orgId: number; project: OrganizationProjectDto; onDone: () => void }) {
  const evaluate = useEvaluateProject(orgId, project.projectId);
  const [overallScore, setOverallScore] = useState(7);
  const [qualityScore, setQualityScore] = useState(7);
  const [timelinessScore, setTimelinessScore] = useState(7);
  const [communicationScore, setCommunicationScore] = useState(7);
  const [comment, setComment] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await evaluate.mutateAsync({
        evaluatorId: project.pmId ?? 1,
        overallScore,
        qualityScore,
        timelinessScore,
        communicationScore,
        comment: comment.trim() || undefined,
      });
      toast.success("Đã gửi đánh giá dự án.");
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gửi đánh giá thất bại.");
    }
  };

  const scoreField = (label: string, value: number, setValue: (v: number) => void) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-600">{label}</span>
      <input type="range" min={0} max={10} step={1} value={value} onChange={(e) => setValue(Number(e.target.value))} className="flex-1 accent-slate-700" />
      <span className="w-8 text-right text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {scoreField("Overall", overallScore, setOverallScore)}
      {scoreField("Quality", qualityScore, setQualityScore)}
      {scoreField("Timeliness", timelinessScore, setTimelinessScore)}
      {scoreField("Communication", communicationScore, setCommunicationScore)}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment..."
        rows={2}
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-slate-500"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
          Cancel
        </button>
        <button type="submit" disabled={evaluate.isPending} className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60">
          {evaluate.isPending ? "Submitting..." : "Submit Evaluation"}
        </button>
      </div>
    </form>
  );
}

function ProjectRow({ orgId, project }: { orgId: number; project: OrganizationProjectDto }) {
  const [showEvaluate, setShowEvaluate] = useState(false);
  const { data: evaluation } = useProjectEvaluation(orgId, project.projectId);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{project.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${riskBadge(project.riskLevel)}`}>{project.riskLevel}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{project.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5">PM: {project.pmName ?? "—"}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5">Team size: {project.teamMemberCount}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5">Progress: {project.progress}%</span>
            <span className="rounded bg-slate-100 px-2 py-0.5">Deadline: {project.deadline ?? "—"}</span>
          </div>
        </div>
        <button
          onClick={() => setShowEvaluate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          <Star size={13} /> {project.isEvaluated ? "Re-evaluate" : "Evaluate"}
        </button>
      </div>

      {showEvaluate && (
        <div className="mt-3">
          <EvaluateForm orgId={orgId} project={project} onDone={() => setShowEvaluate(false)} />
        </div>
      )}

      {evaluation && !showEvaluate && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Sparkles size={12} /> Last evaluation by {evaluation.evaluatorName}
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            <span>Overall: {evaluation.overallScore ?? "—"}</span>
            <span>Quality: {evaluation.qualityScore ?? "—"}</span>
            <span>Timeliness: {evaluation.timelinessScore ?? "—"}</span>
            <span>Communication: {evaluation.communicationScore ?? "—"}</span>
          </div>
          {evaluation.comment && <p className="mt-1 italic text-slate-500">"{evaluation.comment}"</p>}
        </div>
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  const { data, isLoading, isError, error } = useMyOrganization();
  const notFound = error instanceof ApiError && error.status === 404;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
          <Building2 size={12} /> Organization
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Organization projects &amp; closing evaluations</h2>
        <p className="mt-1 text-sm text-slate-500">Only visible to the organization's owner.</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
          <Loader2 className="animate-spin" size={16} /> Loading organization...
        </div>
      )}
      {isError && notFound && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {NOT_FOUND_MESSAGE}
        </div>
      )}
      {isError && !notFound && <div className="py-10 text-center text-sm text-red-500">Không tải được tổ chức.</div>}

      {data && !data.org && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Bạn chưa sở hữu tổ chức nào.
        </div>
      )}

      {data?.org && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">{data.org.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{data.org.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span className="rounded bg-slate-100 px-2 py-0.5">Owner: {data.org.ownerName ?? "—"}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5">{data.projects.length} projects</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {data.projects.map((p) => (
              <ProjectRow key={p.projectId} orgId={data.org!.organizationId} project={p} />
            ))}
            {data.projects.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No projects in this organization yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
