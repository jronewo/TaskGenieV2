import React from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Sparkles, AlertTriangle, Users } from "lucide-react";
import { tasks, teamMembers } from "../data/tmaiData";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./ui/accordion";

const sprintData = [
  { sprint: "S1", completed: 18, planned: 20, risk: 25 },
  { sprint: "S2", completed: 22, planned: 25, risk: 30 },
  { sprint: "S3", completed: 19, planned: 22, risk: 45 },
  { sprint: "S4", completed: 28, planned: 28, risk: 35 },
  { sprint: "S5", completed: 24, planned: 30, risk: 42 },
  { sprint: "S6 (Current)", completed: 11, planned: 24, risk: 58 },
];

const burndownData = [
  { day: "Day 1", remaining: 84, ideal: 84 },
  { day: "Day 3", remaining: 76, ideal: 70 },
  { day: "Day 5", remaining: 62, ideal: 56 },
  { day: "Day 7", remaining: 55, ideal: 42 },
  { day: "Day 9", remaining: 41, ideal: 28 },
  { day: "Day 11", remaining: 30, fill: 14 },
  { day: "Day 13", remaining: 25, ideal: 0 },
];

const riskTrend = [
  { time: "Mon", score: 35 },
  { time: "Tue", score: 42 },
  { time: "Wed", score: 38 },
  { time: "Thu", score: 55 },
  { time: "Fri", score: 62 },
  { time: "Sat", score: 48 },
  { time: "Sun", score: 52 },
];

const riskDistribution = [
  { name: "Safe", value: tasks.filter(t => t.risk === "safe").length, color: "#10B981" },
  { name: "Medium", value: tasks.filter(t => t.risk === "medium").length, color: "#F59E0B" },
  { name: "High", value: tasks.filter(t => t.risk === "high").length, color: "#EF4444" },
  { name: "Critical", value: tasks.filter(t => t.risk === "critical").length, color: "#DC2626" },
];

const affectedTasks = tasks.filter(t => t.risk === "high" || t.risk === "critical");
const criticalCount = tasks.filter(t => t.risk === "critical").length;
const overallRisk: "Low" | "Medium" | "High" = criticalCount > 0 ? "High" : affectedTasks.length >= 2 ? "Medium" : "Low";
const riskLevelStyle = {
  Low: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "#10B981" },
  Medium: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "#F59E0B" },
  High: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "#EF4444" },
}[overallRisk];

const WORKLOAD_CAPACITY = 30; // assumed story-point capacity per person per sprint
const workloadByMember = teamMembers.map(member => {
  const points = tasks.filter(t => t.assignee.id === member.id).reduce((acc, t) => acc + t.storyPoints, 0);
  const pct = Math.round((points / WORKLOAD_CAPACITY) * 100);
  return { member, points, pct, overloaded: pct > 80 };
});

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.08) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold" fontFamily="monospace">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const ReportsDashboard = () => {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Analytics & Reports</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">Sprint performance & AI risk trends</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-purple-200 bg-purple-50/40 text-[11px] font-semibold text-purple-700">
          <Sparkles size={12} />
          <span>AI Analysis Active</span>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "AVG VELOCITY", value: "84 pts", change: "+12%", trendUp: true },
          { label: "ON-TIME RATE", value: "76%", change: "-4%", trendUp: false },
          { label: "TEAM UTILIZATION", value: "89%", change: "+3%", trendUp: true },
          { label: "AI ACCURACY", value: "91%", change: "+7%", trendUp: true },
        ].map((metric, i) => (
          <motion.div
            key={`metric-card-id-${metric.label}`}
            className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-3xs flex flex-col justify-between gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-black text-[#000000] tracking-wider">{metric.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                metric.trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              }`}>
                {metric.change}
              </span>
            </div>
            <div className="text-xl font-extrabold text-[#0F172A] tracking-tight font-mono">{metric.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sprint Velocity */}
        <div className="lg:col-span-2 bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sprint Velocity</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Completed vs Planned tasks</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart id="tmai-velocity-bar-chart-stable" data={sprintData} barGap={4}>
              <CartesianGrid key="grid-velocity" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis key="xaxis-velocity" dataKey="sprint" tick={{ fontSize: 11, fill: "#000000", fontWeight: "bold", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis key="yaxis-velocity" tick={{ fontSize: 11, fill: "#000000", fontWeight: "bold", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip
                key="tooltip-velocity"
                contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 11, fontFamily: "monospace" }}
                cursor={{ fill: "rgba(0,0,0,0.02)" }}
              />
              <Bar key="bar-planned" dataKey="planned" fill="#E2E8F0" radius={[2, 2, 0, 0]} name="Planned" />
              <Bar key="bar-completed" dataKey="completed" fill="#1A237E" radius={[2, 2, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Risk Distribution</h3>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-3">AI risk classification</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart id="tmai-risk-pie-chart-stable">
              <Pie
                key="pie-risk-core"
                data={riskDistribution}
                cx="50%" cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={64}
                dataKey="value"
                strokeWidth={1.5}
                stroke="white"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`pie-cell-item-${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip key="tooltip-pie-risk" contentStyle={{ borderRadius: 8, fontSize: 11, fontFamily: "monospace" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2 border-t border-gray-50 pt-2">
            {riskDistribution.map(d => (
              <div key={`legend-item-id-${d.name}`} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[10px] text-black font-bold font-mono">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Risk Trend + Burndown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Trend */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Weekly Risk Trend</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">AI-calculated risk scores</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart id="tmai-risk-trend-line-chart-stable" data={riskTrend}>
              <CartesianGrid key="grid-risk-trend" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis key="xaxis-risk-trend" dataKey="time" tick={{ fontSize: 11, fill: "#000000", fontWeight: "bold", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis key="yaxis-risk-trend" domain={[0, 100]} tick={{ fontSize: 11, fill: "#000000", fontWeight: "bold", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip key="tooltip-risk-trend" contentStyle={{ borderRadius: 8, fontSize: 11, fontFamily: "monospace" }} />
              <Line key="line-risk-score" type="monotone" dataKey="score" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444", r: 3 }} name="Risk Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Burndown */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sprint Burndown</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Story points remaining</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart id="tmai-burndown-line-chart-stable" data={burndownData}>
              <CartesianGrid key="grid-burndown" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis key="xaxis-burndown" dataKey="day" tick={{ fontSize: 11, fill: "#000000", fontWeight: "bold", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis key="yaxis-burndown" tick={{ fontSize: 11, fill: "#000000", fontWeight: "bold", fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip key="tooltip-burndown" contentStyle={{ borderRadius: 8, fontSize: 11, fontFamily: "monospace" }} />
              <Line key="line-burndown-ideal" type="monotone" dataKey="ideal" stroke="#CBD5E1" strokeWidth={1.2} strokeDasharray="4 4" dot={false} name="Ideal" />
              <Line key="line-burndown-actual" type="monotone" dataKey="remaining" stroke="#7C4DFF" strokeWidth={2} dot={{ fill: "#7C4DFF", r: 2.5 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Risk Analysis */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-500" /> AI Risk Analysis
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Portfolio-wide risk assessment across all tasks</p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${riskLevelStyle.bg} ${riskLevelStyle.text} ${riskLevelStyle.border}`}>
            {overallRisk} Risk
          </span>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          {affectedTasks.length} of {tasks.length} tasks are at elevated risk.{" "}
          {criticalCount > 0
            ? `${criticalCount} critical task${criticalCount > 1 ? "s" : ""} need immediate attention.`
            : "No critical blockers right now — keep an eye on the items below."}
        </p>

        {affectedTasks.length > 0 ? (
          <div className="space-y-2">
            {affectedTasks.map(t => (
              <div key={`risk-task-${t.id}`} className={`flex items-start gap-3 p-2.5 rounded-lg border ${t.risk === "critical" ? "bg-red-50/60 border-red-100" : "bg-amber-50/50 border-amber-100"}`}>
                <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${t.risk === "critical" ? "text-red-500" : "text-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800 truncate">{t.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${t.risk === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {t.risk}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Recommendation: {t.aiInsight}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-gray-400 p-3 text-center border border-dashed border-gray-200 rounded">No elevated-risk tasks right now.</div>
        )}
      </div>

      {/* AI Workload Analysis */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
        <div className="mb-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={12} className="text-blue-500" /> AI Workload Analysis
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Assigned story points vs. estimated sprint capacity per person</p>
        </div>

        <div className="space-y-3">
          {workloadByMember.map(({ member, points, pct, overloaded }) => (
            <div key={`workload-${member.id}`} className="flex items-center gap-3">
              <img src={member.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate">{member.name}</span>
                  <span className={`text-[10px] font-bold ${overloaded ? "text-red-600" : "text-gray-500"}`}>
                    {points} pts · {pct}% {overloaded && "· Overloaded"}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${overloaded ? "bg-red-500" : "bg-gray-700"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Performance Audit */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-3xs">
        <div className="mb-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Team Performance Audit</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Expand any team member to review completed and pending sprint tasks</p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {teamMembers.map((member) => {
            const memberTasks = tasks.filter(t => t.assignee.id === member.id);
            const completedTasks = memberTasks.filter(t => t.status === "done");
            const pendingTasks = memberTasks.filter(t => t.status !== "done");
            const completion = memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0;

            return (
              <AccordionItem
                value={member.id}
                key={`audit-accordion-item-key-id-${member.id}`}
                className="border border-gray-200 rounded overflow-hidden bg-white shadow-3xs"
              >
                <AccordionTrigger className="px-3 py-2.5 hover:bg-gray-50/50 transition-colors outline-none hover:no-underline text-xs flex items-center justify-between w-full font-medium">
                  <div className="flex items-center gap-3 text-left">
                    <img src={member.avatar} alt="" className="w-8 h-8 rounded object-cover border border-gray-100" />
                    <div>
                      <div className="font-bold text-gray-800">{member.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">{member.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 mr-2">
                    <div className="text-right w-24 hidden sm:block">
                      <div className="text-[10px] text-gray-700 font-bold">{completion}% Performance</div>
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gray-900" style={{ width: `${completion}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-50 text-gray-700 px-2 py-0.5 rounded border border-gray-200/60 font-mono">
                      {completedTasks.length}/{memberTasks.length} Done
                    </span>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="bg-gray-50/40 border-t border-gray-100 p-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1 px-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-amber-500" /> Pending Tasks ({pendingTasks.length})
                    </div>
                    {pendingTasks.map(t => (
                      <div key={`task-pending-item-key-${member.id}-${t.id}`} className="p-2 bg-white rounded border border-gray-200 flex justify-between items-center gap-3">
                        <span className="text-gray-800 font-medium truncate flex-1">{t.title}</span>
                        <span className={`text-[9px] font-bold px-1 rounded uppercase tracking-wide shrink-0 font-mono ${
                          t.risk === "critical" ? "bg-red-50 text-red-600 border border-red-100 animate-pulse" : "bg-gray-100 text-gray-500"
                        }`}>
                          {t.status.replace("_", " ")} {t.risk === "critical" && "⚠"}
                        </span>
                      </div>
                    ))}
                    {pendingTasks.length === 0 && (
                      <div className="text-[10px] text-gray-400 p-2 text-center border border-dashed border-gray-200 rounded">No pending tasks.</div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[9px] font-bold text-green-600 uppercase tracking-wider mb-1 px-0.5 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-green-500" /> Completed Tasks ({completedTasks.length})
                    </div>
                    {completedTasks.map(t => (
                      <div key={`task-completed-item-key-${member.id}-${t.id}`} className="p-2 bg-white/60 rounded border border-gray-200/60 flex justify-between items-center gap-3 text-gray-400">
                        <span className="line-through truncate flex-1 font-normal">{t.title}</span>
                        <span className="text-[9px] font-bold px-1 rounded bg-green-50 text-green-600 border border-green-100 shrink-0 font-mono">DONE</span>
                      </div>
                    ))}
                    {completedTasks.length === 0 && (
                      <div className="text-[10px] text-gray-400 p-2 text-center border border-dashed border-gray-200 rounded">No completed tasks yet.</div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};