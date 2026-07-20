import React, { useState } from "react";
import { motion } from "motion/react";
import { Users, Briefcase, Sparkles, Star } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import {
  teamMembers,
  projects,
  MemberEvaluation,
  ProjectEvaluation,
  memberEvaluations as seedMemberEvaluations,
  projectEvaluations as seedProjectEvaluations,
} from "../data/tmaiData";

type EvalTab = "team" | "project";

const avg = (nums: number[]) => (nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const scoreColor = (score: number) => (score >= 8 ? "text-emerald-600" : score >= 6 ? "text-amber-600" : "text-red-600");
const scoreBg = (score: number) => (score >= 8 ? "bg-emerald-50 border-emerald-200" : score >= 6 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200");

const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold text-slate-800">{value}/10</span>
    </div>
    <input
      type="range"
      min={0}
      max={10}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#1A237E] cursor-pointer"
    />
  </div>
);

export const EvaluationCenter = () => {
  const [tab, setTab] = useState<EvalTab>("team");

  const [memberEvals, setMemberEvals] = useState<MemberEvaluation[]>(seedMemberEvaluations);
  const [projectEvals, setProjectEvals] = useState<ProjectEvaluation[]>(seedProjectEvaluations);

  const [selectedMemberId, setSelectedMemberId] = useState(teamMembers[0]?.id ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");

  const [memberForm, setMemberForm] = useState({ skill: 5, teamwork: 5, communication: 5, deadline: 5, comment: "" });
  const [projectForm, setProjectForm] = useState({ quality: 5, timeline: 5, teamEfficiency: 5, comment: "" });

  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId);
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const memberHistory = memberEvals
    .filter((e) => e.memberId === selectedMemberId)
    .sort((a, b) => b.date.localeCompare(a.date));
  const projectHistory = projectEvals
    .filter((e) => e.projectId === selectedProjectId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const memberOverallAvg = avg(memberHistory.flatMap((e) => [e.skill, e.teamwork, e.communication, e.deadline]));
  const projectAspectAverages = {
    quality: avg(projectHistory.map((e) => e.quality)),
    timeline: avg(projectHistory.map((e) => e.timeline)),
    teamEfficiency: avg(projectHistory.map((e) => e.teamEfficiency)),
  };
  const projectOverallAvg = avg([projectAspectAverages.quality, projectAspectAverages.timeline, projectAspectAverages.teamEfficiency]);

  const radarData = [
    { aspect: "Quality", score: Number(projectAspectAverages.quality.toFixed(1)) },
    { aspect: "Timeline", score: Number(projectAspectAverages.timeline.toFixed(1)) },
    { aspect: "Team Efficiency", score: Number(projectAspectAverages.teamEfficiency.toFixed(1)) },
  ];
  const weakestAspect = radarData.reduce((min, a) => (a.score < min.score ? a : min), radarData[0]);

  const aiInsight =
    projectHistory.length === 0
      ? "No evaluations yet for this project — submit one below to see AI insights."
      : weakestAspect.score < 6.5
      ? `${weakestAspect.aspect} is the weakest area (avg ${weakestAspect.score.toFixed(1)}/10). Recommend focusing improvement efforts here before the next milestone.`
      : `All aspects are performing well — lowest is ${weakestAspect.aspect} at ${weakestAspect.score.toFixed(1)}/10. Keep up the current momentum.`;

  const handleSubmitMemberEval = (e: React.FormEvent) => {
    e.preventDefault();
    const newEval: MemberEvaluation = {
      id: `eval-m-${Date.now()}`,
      memberId: selectedMemberId,
      date: new Date().toISOString().slice(0, 10),
      ...memberForm,
    };
    setMemberEvals((prev) => [newEval, ...prev]);
    setMemberForm({ skill: 5, teamwork: 5, communication: 5, deadline: 5, comment: "" });
  };

  const handleSubmitProjectEval = (e: React.FormEvent) => {
    e.preventDefault();
    const newEval: ProjectEvaluation = {
      id: `eval-p-${Date.now()}`,
      projectId: selectedProjectId,
      date: new Date().toISOString().slice(0, 10),
      ...projectForm,
    };
    setProjectEvals((prev) => [newEval, ...prev]);
    setProjectForm({ quality: 5, timeline: 5, teamEfficiency: 5, comment: "" });
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700">
            <Star size={12} /> Evaluation Management
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Evaluate team members and projects</h2>
          <p className="mt-1 text-sm text-slate-500">Score against key criteria, track history, and review AI-summarized insights.</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shrink-0">
          {[
            { id: "team" as EvalTab, label: "Team Evaluations", icon: Users },
            { id: "project" as EvalTab, label: "Project Evaluations", icon: Briefcase },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "team" && (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Team Members</h3>
            <div className="space-y-2">
              {teamMembers.map((member) => {
                const rounds = memberEvals.filter((e) => e.memberId === member.id);
                const memberAvg = avg(rounds.flatMap((e) => [e.skill, e.teamwork, e.communication, e.deadline]));
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedMemberId === member.id ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={member.avatar} alt={member.name} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">{member.name}</div>
                        <div className="text-xs text-slate-500 truncate">{member.role}</div>
                      </div>
                      {rounds.length > 0 && (
                        <span className={`text-xs font-bold shrink-0 ${scoreColor(memberAvg)}`}>{memberAvg.toFixed(1)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMember && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={13} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-slate-900">New Evaluation — {selectedMember.name}</h3>
                </div>
                <form onSubmit={handleSubmitMemberEval} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ScoreSlider label="Skill" value={memberForm.skill} onChange={(v) => setMemberForm((p) => ({ ...p, skill: v }))} />
                    <ScoreSlider label="Teamwork" value={memberForm.teamwork} onChange={(v) => setMemberForm((p) => ({ ...p, teamwork: v }))} />
                    <ScoreSlider label="Communication" value={memberForm.communication} onChange={(v) => setMemberForm((p) => ({ ...p, communication: v }))} />
                    <ScoreSlider label="Deadline Adherence" value={memberForm.deadline} onChange={(v) => setMemberForm((p) => ({ ...p, deadline: v }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Comment</label>
                    <textarea
                      value={memberForm.comment}
                      onChange={(e) => setMemberForm((p) => ({ ...p, comment: e.target.value }))}
                      rows={2}
                      placeholder="Notes for this evaluation round..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Submit Evaluation
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Evaluation History</h3>
                  {memberHistory.length > 0 && (
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreBg(memberOverallAvg)} ${scoreColor(memberOverallAvg)}`}>
                      Average: {memberOverallAvg.toFixed(1)}/10
                    </div>
                  )}
                </div>
                {memberHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No evaluations yet.</div>
                ) : (
                  <div className="space-y-2">
                    {memberHistory.map((ev) => {
                      const roundAvg = avg([ev.skill, ev.teamwork, ev.communication, ev.deadline]);
                      return (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-slate-200 p-3"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-slate-700">{ev.date}</span>
                            <span className={`text-xs font-bold ${scoreColor(roundAvg)}`}>{roundAvg.toFixed(1)}/10</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-1.5">
                            <span>Skill {ev.skill}</span>
                            <span>Teamwork {ev.teamwork}</span>
                            <span>Communication {ev.communication}</span>
                            <span>Deadline {ev.deadline}</span>
                          </div>
                          {ev.comment && <p className="text-xs text-slate-600 leading-relaxed">{ev.comment}</p>}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "project" && (
        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Projects</h3>
            <div className="space-y-2">
              {projects.map((project) => {
                const rounds = projectEvals.filter((e) => e.projectId === project.id);
                const projAvg = avg(rounds.flatMap((e) => [e.quality, e.timeline, e.teamEfficiency]));
                return (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedProjectId === project.id ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg shrink-0">{project.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">{project.name}</div>
                        <div className="text-xs text-slate-500">{rounds.length} evaluation{rounds.length !== 1 ? "s" : ""}</div>
                      </div>
                      {rounds.length > 0 && (
                        <span className={`text-xs font-bold shrink-0 ${scoreColor(projAvg)}`}>{projAvg.toFixed(1)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedProject && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={13} className="text-purple-500" />
                  <h3 className="text-sm font-semibold text-slate-900">New Evaluation — {selectedProject.name}</h3>
                </div>
                <form onSubmit={handleSubmitProjectEval} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ScoreSlider label="Quality" value={projectForm.quality} onChange={(v) => setProjectForm((p) => ({ ...p, quality: v }))} />
                    <ScoreSlider label="Timeline" value={projectForm.timeline} onChange={(v) => setProjectForm((p) => ({ ...p, timeline: v }))} />
                    <ScoreSlider label="Team Efficiency" value={projectForm.teamEfficiency} onChange={(v) => setProjectForm((p) => ({ ...p, teamEfficiency: v }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Comment</label>
                    <textarea
                      value={projectForm.comment}
                      onChange={(e) => setProjectForm((p) => ({ ...p, comment: e.target.value }))}
                      rows={2}
                      placeholder="Notes for this evaluation round..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Submit Evaluation
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Evaluation Summary</h3>
                  {projectHistory.length > 0 && (
                    <div className={`rounded-full border px-2.5 py-1 text-xs font-bold ${scoreBg(projectOverallAvg)} ${scoreColor(projectOverallAvg)}`}>
                      Overall: {projectOverallAvg.toFixed(1)}/10
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="75%">
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="aspect" tick={{ fontSize: 11, fill: "#475569" }} />
                        <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9, fill: "#94A3B8" }} tickCount={6} />
                        <Radar dataKey="score" stroke="#1A237E" fill="#1A237E" fillOpacity={0.25} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-3">
                    <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                        <Sparkles size={12} /> AI Insights
                      </div>
                      <p className="text-xs text-purple-800 leading-relaxed">{aiInsight}</p>
                    </div>
                    {radarData.map((a) => (
                      <div key={a.aspect} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{a.aspect}</span>
                        <span className={`font-bold ${scoreColor(a.score)}`}>{a.score.toFixed(1)}/10</span>
                      </div>
                    ))}
                  </div>
                </div>

                {projectHistory.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {projectHistory.map((ev) => {
                      const roundAvg = avg([ev.quality, ev.timeline, ev.teamEfficiency]);
                      return (
                        <div key={ev.id} className="rounded-lg border border-slate-200 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-700">{ev.date}</span>
                            <span className={`text-[11px] font-bold ${scoreColor(roundAvg)}`}>{roundAvg.toFixed(1)}/10</span>
                          </div>
                          {ev.comment && <p className="text-[11px] text-slate-500 mt-1">{ev.comment}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
