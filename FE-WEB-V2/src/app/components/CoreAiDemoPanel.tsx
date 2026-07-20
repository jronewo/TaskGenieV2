import React, { useState } from "react";
import { AlertTriangle, BrainCircuit, Check, Clock3, Link, Loader2, RefreshCw, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AssignmentResponse, coreAiApi, EvidenceItem, RiskAssessment } from "../services/coreAiApi";

const scoreColor = (score: number) =>
  score >= 80 ? "text-red-700 bg-red-50 border-red-200" :
  score >= 60 ? "text-orange-700 bg-orange-50 border-orange-200" :
  score >= 30 ? "text-amber-700 bg-amber-50 border-amber-200" :
  "text-emerald-700 bg-emerald-50 border-emerald-200";

export const CoreAiDemoPanel = () => {
  const [taskId, setTaskId] = useState(1);
  const [projectId, setProjectId] = useState(1);
  const [leaderId, setLeaderId] = useState(1);
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [history, setHistory] = useState<RiskAssessment[]>([]);
  const [recommendations, setRecommendations] = useState<AssignmentResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try { await action(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Request failed."); }
    finally { setBusy(null); }
  };

  const analyzeRisk = () => run("risk", async () => {
    const assessment = await coreAiApi.analyzeRisk(taskId, leaderId);
    setRisk(assessment);
    setHistory(await coreAiApi.getRiskHistory(taskId, leaderId));
    toast.success(`Risk ${assessment.riskLevel}: ${assessment.totalScore}/100`);
  });

  const recommend = () => run("recommend", async () => {
    const response = await coreAiApi.recommend(taskId, projectId, leaderId);
    setRecommendations(response);
    toast.success(`${response.suggestions.length} candidates ranked.`);
  });

  const refreshEvidence = () => run("evidence", async () => {
    setEvidence(await coreAiApi.getEvidence(taskId, leaderId));
  });

  const addEvidence = () => run("add-evidence", async () => {
    await coreAiApi.addUrlEvidence(taskId, evidenceUrl, "Demo evidence", leaderId);
    setEvidenceUrl("");
    setEvidence(await coreAiApi.getEvidence(taskId, leaderId));
    toast.success("Evidence saved.");
  });

  const decide = (candidateId: number, accepted: boolean) => run(`decision-${candidateId}`, async () => {
    if (accepted) await coreAiApi.acceptRecommendation(taskId, candidateId, leaderId);
    else await coreAiApi.rejectRecommendation(taskId, candidateId, leaderId);
    toast.success(accepted ? "Recommendation accepted and task assigned." : "Rejection feedback recorded.");
  });

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-5">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <div className="flex items-center gap-2"><BrainCircuit size={19} className="text-indigo-700" /><h1 className="text-base font-black text-slate-900">AI CORE DEMO</h1></div>
            <p className="mt-1 text-xs text-slate-500">Live API: explainable risk scoring, evidence and personnel recommendation</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">REAL BACKEND DATA</span>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          {[{ label: "Task ID", value: taskId, set: setTaskId }, { label: "Project ID", value: projectId, set: setProjectId }, { label: "Leader/User ID", value: leaderId, set: setLeaderId }].map((field) => (
            <label key={field.label} className="text-[10px] font-bold uppercase text-slate-500">{field.label}
              <input type="number" min={1} value={field.value} onChange={(event) => field.set(Number(event.target.value))} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500" />
            </label>
          ))}
          <div className="flex gap-2 md:col-span-3">
            <button onClick={analyzeRisk} disabled={busy !== null} className="flex items-center gap-2 rounded-md bg-indigo-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {busy === "risk" ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Analyze risk
            </button>
            <button onClick={recommend} disabled={busy !== null} className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
              {busy === "recommend" ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Recommend Top 3
            </button>
            <button onClick={refreshEvidence} disabled={busy !== null} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><RefreshCw size={13} /> Refresh evidence</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-black uppercase text-slate-800">Risk Assessment</h2>
            {!risk ? <p className="mt-6 text-center text-xs text-slate-400">Run risk analysis to view score and factor evidence.</p> : (
              <div className="mt-3 space-y-3">
                <div className={`flex items-center justify-between rounded-lg border p-3 ${scoreColor(risk.totalScore)}`}>
                  <div><div className="text-[10px] font-bold uppercase">{risk.riskLevel}</div><div className="text-2xl font-black">{risk.totalScore}<span className="text-xs">/100</span></div></div>
                  <div className="text-right text-[10px]"><div>{risk.ruleVersion}</div><div>{risk.calculationMode}</div></div>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{risk.explanation}</p>
                <div className="space-y-2">{risk.factors.map((factor) => (
                  <div key={factor.code} className="rounded-lg border border-slate-100 p-2.5">
                    <div className="flex justify-between text-xs"><span className="font-bold text-slate-700">{factor.code}</span><span className="font-mono font-bold">{factor.score} × {(factor.weight * 100).toFixed(0)}% = {factor.contribution}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100"><div className="h-full bg-indigo-600" style={{ width: `${factor.score}%` }} /></div>
                    <p className="mt-1 text-[10px] text-slate-500">{factor.evidence}</p>
                  </div>
                ))}</div>
                <ul className="space-y-1 text-[11px] text-slate-600">{risk.mitigationActions.map((action) => <li key={action}>• {action}</li>)}</ul>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-xs font-black uppercase text-slate-800">Top Personnel Recommendations</h2>
            {!recommendations ? <p className="mt-6 text-center text-xs text-slate-400">Generate recommendations to compare component scores.</p> : (
              <div className="mt-3 space-y-2">
                <div className="text-[10px] text-slate-400">Run {recommendations.runId} · {recommendations.providerStatus}</div>
                {recommendations.suggestions.map((candidate) => (
                  <div key={candidate.userId} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between"><div><span className="mr-2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">#{candidate.rank}</span><span className="text-sm font-bold text-slate-900">{candidate.userName}</span></div><span className="font-mono text-sm font-black text-indigo-700">{candidate.score}</span></div>
                    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[9px] text-slate-500">{[["Skill", candidate.skillMatchScore], ["Semantic", candidate.semanticSimilarityScore], ["Workload", candidate.workloadScore], ["Performance", candidate.performanceScore]].map(([label, value]) => <div key={String(label)} className="rounded bg-slate-50 p-1"><div>{label}</div><b className="text-slate-800">{value}</b></div>)}</div>
                    <div className="mt-2 flex gap-2"><button onClick={() => decide(candidate.userId, true)} className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white"><Check size={11} /> Accept</button><button onClick={() => decide(candidate.userId, false)} className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-[10px] font-bold text-red-600"><X size={11} /> Reject</button></div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="flex items-center gap-2 text-xs font-black uppercase text-slate-800"><Link size={13} /> URL Evidence</h2><div className="mt-3 flex gap-2"><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-500" /><button onClick={addEvidence} disabled={!evidenceUrl || busy !== null} className="rounded-md bg-indigo-700 px-3 text-xs font-bold text-white disabled:opacity-40">Save</button></div><div className="mt-2 space-y-1">{evidence.map((item) => <a key={item.evidenceId} href={item.externalUrl} target="_blank" rel="noreferrer" className="block truncate rounded bg-slate-50 p-2 text-[11px] text-indigo-700">{item.description || item.externalUrl}</a>)}</div></section>
          <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="flex items-center gap-2 text-xs font-black uppercase text-slate-800"><Clock3 size={13} /> Risk History</h2><div className="mt-3 space-y-1">{history.map((item) => <div key={item.runId} className="flex items-center justify-between rounded bg-slate-50 p-2 text-[11px]"><span>{new Date(item.createdAt).toLocaleString()}</span><span className={`rounded border px-2 py-0.5 font-bold ${scoreColor(item.totalScore)}`}>{item.riskLevel} · {item.totalScore}</span></div>)}</div></section>
        </div>
      </div>
    </div>
  );
};
