import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { ReportsDashboard } from "./components/ReportsDashboard";
import { ProjectWorkspace } from "./components/ProjectWorkspace";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { TaskFormModal, taskToFormValues } from "./components/TaskFormModal";
import { PublicGate } from "./components/PublicGate";
import { Project, TeamMember, Task } from "./data/tmaiData";
import {
  AlertTriangle, CheckCircle, TrendingUp, Layers, ChevronRight, Plus, LogOut, Loader2
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { ApiError } from "../lib/apiClient";
import type { ProjectType } from "./data/tmaiData";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/ui/accordion";

const getRiskBadge = (score: number) => {
  if (score >= 80) return { label: "Critical", cls: "bg-red-100 text-red-700 border border-red-200" };
  if (score >= 60) return { label: "High Risk", cls: "bg-amber-100 text-amber-700 border border-amber-200" };
  if (score >= 35) return { label: "At Risk", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
  return { label: "On Track", cls: "bg-gray-100 text-gray-600 border border-gray-200" };
};

const getProgress = (project: Project) =>
  project.progress ?? Math.round(Math.max(10, 92 - project.riskScore * 0.68));

const DashboardSummaryBar = () => {
  const { projects, tasks } = useProject();
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const critical = tasks.filter((t) => t.risk === "critical").length;
  const inProg = tasks.filter((t) => t.status === "in_progress").length;
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  const stats = [
    { label: "Total Tasks", value: total, sub: `${done} done`, icon: Layers, alert: false },
    { label: "Completion", value: `${completion}%`, sub: `${done}/${total}`, icon: CheckCircle, alert: false },
    { label: "In Progress", value: inProg, sub: "active", icon: TrendingUp, alert: false },
    { label: "Critical", value: critical, sub: "need attention", icon: AlertTriangle, alert: critical > 0 },
    { label: "Projects", value: projects.length, sub: "tracked", icon: Layers, alert: false },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-white overflow-x-auto">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border shrink-0 ${
            s.alert ? "border-red-200 bg-red-50" : "border-gray-100 bg-white"
          }`}
        >
          <s.icon size={13} className={s.alert ? "text-red-500" : "text-gray-400"} />
          <div>
            <span className={`text-xs font-bold ${s.alert ? "text-red-700" : "text-gray-900"}`}>
              {s.value}
            </span>
            <span className="text-[10px] text-gray-400 ml-1">{s.sub}</span>
          </div>
          <span className="text-[10px] text-gray-400 border-l border-gray-100 pl-2">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

const ProjectGrid = ({
  onSelect,
  onInvite,
}: {
  onSelect: (p: Project) => void;
  onInvite?: (p: Project) => void;
}) => {
  const { projects, canInviteToProject } = useProject();

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm">
        No projects yet. Create your first project from the sidebar.
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Projects Overview</h2>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {projects.length} active · Click any project to open board & tasks
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {projects.map((project, i) => {
          const progress = getProgress(project);
          const badge = getRiskBadge(project.riskScore);
          const isHighRisk = project.riskScore >= 60;

          return (
            <motion.button
              key={project.id}
              className={`text-left bg-white border rounded-lg p-3.5 hover:shadow-sm transition-all group flex flex-col justify-between h-[135px] ${
                isHighRisk ? "border-gray-200" : "border-gray-100"
              }`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(project)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between w-full gap-2 mb-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wide truncate min-w-0">
                  {project.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    project.projectType === "Personal"
                      ? "bg-violet-50 text-violet-700 border border-violet-100"
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}>
                    {project.projectType === "Personal" ? "Personal" : "Team"}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>

              <div className="mb-2">
                <div className="text-[10px] text-gray-500 font-mono">
                  {project.taskCount} tasks · Risk Score: {project.riskScore}
                </div>
                {project.children && project.children.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {project.children.map((child) => (
                      <span
                        key={child.id}
                        className="text-[9px] bg-gray-50 text-gray-600 border border-gray-100 px-1 py-0.5 rounded font-medium"
                      >
                        {child.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] text-gray-400 font-medium">Progress</span>
                  <span className="text-[10px] font-bold text-gray-700 font-mono">{progress}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      project.riskScore >= 80 ? "bg-red-500" : project.riskScore >= 60 ? "bg-amber-500" : "bg-gray-700"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.55, delay: 0.08 + i * 0.04 }}
                  />
                </div>
              </div>
              {canInviteToProject(project.id) && onInvite && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onInvite(project); }}
                  className="mt-2 text-[10px] font-bold text-[#1A237E] hover:underline text-left"
                >
                  + Invite member
                </button>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-5 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-3xs">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70">
          <span className="text-xs font-black text-[#000000] tracking-wider uppercase">
            Risk Summary Matrix
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/40">
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider w-1/3">PROJECT NAME</th>
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider text-center w-1/6">TASKS COUNT</th>
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider w-1/3">COMPLETION PROGRESS</th>
                <th className="px-4 py-2.5 font-black text-[#000000] uppercase tracking-wider text-center w-1/6">RISK LEVEL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => {
                const badge = getRiskBadge(project.riskScore);
                const progress = getProgress(project);
                return (
                  <tr 
                    key={project.id}
                    onClick={() => onSelect(project)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-bold text-gray-900 uppercase tracking-wide">
                      {project.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-bold font-mono text-center">
                      {project.taskCount} tasks
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                          <div
                            className={`h-full rounded-full ${
                              project.riskScore >= 80 ? "bg-red-500" : project.riskScore >= 60 ? "bg-amber-500" : "bg-gray-700"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 font-mono w-8 shrink-0 text-right">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded inline-block w-20 font-mono ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PendingInvitationsBanner = () => {
  const { pendingInvitations, acceptInvitation } = useProject();
  if (pendingInvitations.length === 0) return null;

  return (
    <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
      <p className="text-xs font-bold text-blue-900">Project invitations</p>
      {pendingInvitations.map((inv) => (
        <div key={inv.invitationId} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-blue-800">
            Join <strong>{inv.teamName ?? "team project"}</strong>
          </span>
          <button
            type="button"
            onClick={() => acceptInvitation(inv.invitationId)}
            className="px-2.5 py-1 bg-[#1A237E] text-white rounded font-semibold text-[10px]"
          >
            Accept
          </button>
        </div>
      ))}
    </div>
  );
};

const MemberModalContent = ({ 
  member, 
  onClose 
}: { 
  member: TeamMember; 
  onClose: () => void; 
}) => {
  const { tasks, projects } = useProject();
  const allMemberTasks = tasks.filter((t) => t.assignee.id === member.id);
  const activeProjects = projects.filter((project) =>
    allMemberTasks.some((task) => task.projectId === project.id)
  );

  return (
    <>
      <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={member.avatar} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
          <div>
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">{member.name}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{member.role}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] font-bold text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors font-mono"
        >
          CLOSE [X]
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-0.5">
          Project Workload Distribution
        </div>

        {activeProjects.length > 0 ? (
          <Accordion type="multiple" className="space-y-1.5">
            {activeProjects.map((project) => {
              let projectTasks = allMemberTasks.filter((task) => task.projectId === project.id);

              if (false) {
                projectTasks = [{
                  id: "task-test",
                  title: "Cross-Project Mobile API Integration & Testing",
                  description: "Phân rã liên kết API đa nền tảng kết hợp xử lý đồng bộ cơ sở dữ liệu di động.",
                  status: "in_progress",
                  priority: "high",
                  risk: "medium",
                  riskScore: 40,
                  assignee: member,
                  deadline: "2026-05-28",
                  tags: ["Mobile", "API"],
                  progress: 50,
                  aiInsight: "Context switch detected by AI engine.",
                  comments: 2,
                  attachments: 0,
                  storyPoints: 5
                }];
              }

              const hasCritical = projectTasks.some(t => t.risk === "critical");

              return (
                <AccordionItem
                  value={project.id}
                  key={`modal-project-item-key-${project.id}`}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-3xs"
                >
                  <AccordionTrigger className="px-3 py-2 hover:bg-gray-50 transition-colors outline-none hover:no-underline text-xs flex items-center justify-between w-full font-bold text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className={hasCritical ? "text-red-700 font-black" : ""}>
                        {project.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100 mr-2 font-mono">
                      {projectTasks.length} Tác vụ
                    </span>
                  </AccordionTrigger>

                  <AccordionContent className="bg-slate-50/50 border-t border-gray-100 p-2 divide-y divide-gray-100">
                    {projectTasks.map((task) => {
                      const isCritical = task.risk === "critical";
                      const isHigh = task.risk === "high";

                      return (
                        <div key={`modal-task-row-id-${task.id}`} className="py-2 px-1 flex items-start justify-between gap-3 text-[11px]">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] text-gray-400">#{task.id}</span>
                              <h5 className={`font-semibold text-gray-800 truncate ${isCritical ? "text-red-700 font-black animate-pulse" : ""}`}>
                                {task.title}
                              </h5>
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-1">{task.description}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-0.5 font-mono">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                              task.status === "done" ? "bg-green-50 text-green-700 border border-green-100" :
                              task.status === "in_progress" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-gray-100 text-gray-400"
                            }`}>
                              {task.status.replace("_", " ")}
                            </span>
                            {isCritical ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                <AlertTriangle size={9} /> Critical
                              </span>
                            ) : isHigh ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                High Risk
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="text-center py-6 text-xs text-gray-400">
            Nhân sự này hiện chưa được phân phối tác vụ nào.
          </div>
        )}
      </div>
    </>
  );
};

const TeamView = () => {
  const { teamMembers, tasks } = useProject();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto bg-[#F8FAFC]">
      <div>
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Team Console</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {teamMembers.length} active core members · Click any block to audit their active work allocation
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {teamMembers.map((member, i) => {
          const memberTasks = tasks.filter((t) => t.assignee.id === member.id);
          const criticalCount = memberTasks.filter((t) => t.risk === "critical").length;

          return (
            <motion.button
              key={`team-grid-card-id-${member.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#1A237E] hover:shadow-sm transition-all flex flex-col items-center justify-between text-center min-h-[230px] group relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedMember(member)} 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
            >
              {criticalCount > 0 && (
                <span className="absolute top-3 right-3 bg-red-50 text-red-700 border border-red-200 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded animate-pulse flex items-center gap-0.5">
                  <AlertTriangle size={10} /> {criticalCount} ALERT
                </span>
              )}

              <div className="flex flex-col items-center w-full">
                <img src={member.avatar} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-100 mb-3" />
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-0.5">{member.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{member.role}</p>

                <div className="flex flex-wrap gap-1 justify-center max-h-[36px] overflow-hidden">
                  {member.skills.map((skill) => (
                    <span key={`card-skill-${member.id}-${skill}`} className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 font-mono">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full pt-2.5 mt-3 border-t border-gray-100 flex items-center justify-between text-[10px]">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Allocated Tasks</span>
                <span className="font-bold text-gray-700 font-mono bg-gray-100 px-2 py-0.5 rounded border">
                  {memberTasks.length} Items
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/20 backdrop-blur-xs"
              onClick={() => setSelectedMember(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative bg-white border-2 border-[#1A237E] rounded-xl w-full max-w-xl h-[70vh] flex flex-col shadow-2xl overflow-hidden z-10"
              initial={{ scale: 0.97, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 10 }}
              transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
            >
              <MemberModalContent member={selectedMember} onClose={() => setSelectedMember(null)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationsView = () => {
  const { notifications } = useProject();

  return (
  <div className="p-4 space-y-2 max-w-xl">
    <div>
      <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {notifications.filter((n) => !n.isRead).length} unread
      </p>
    </div>
    {notifications.length === 0 ? (
      <p className="text-sm text-gray-400 py-8 text-center">No notifications</p>
    ) : (
    notifications.map((notif) => (
      <motion.div
        key={notif.id}
        className={`flex items-start gap-3 p-3 rounded-lg border ${
          notif.urgent ? "bg-red-50 border-red-100" : "bg-white border-gray-100"
        }`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${notif.urgent ? "bg-red-500" : "bg-gray-300"}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
            {notif.urgent && (
              <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-semibold shrink-0">
                URGENT
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{notif.body}</p>
          <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
        </div>
      </motion.div>
    )))}
  </div>
  );
};

const SettingsView = () => {
  const [settingsState, setSettingsState] = useState({
    "Enable AI Risk Prediction": true,
    "AI Team Suggestions": true,
    "Deadline Conflict Detection": true,
    "Critical Risk Alerts": true,
    "Weekly Reports": false,
    "Team Updates": true,
  });

  const toggleSetting = (label: string) => {
    setSettingsState((prev) => ({
      ...prev,
      [label]: !prev[label as keyof typeof prev],
    }));
  };

  const sections = [
    {
      section: "AI Engine",
      items: [
        { label: "Enable AI Risk Prediction", desc: "Automatically assess task risk levels" },
        { label: "AI Team Suggestions", desc: "Suggest optimal team members for tasks" },
        { label: "Deadline Conflict Detection", desc: "Alert when tasks have overlapping deadlines" },
      ],
    },
    {
      section: "Notifications",
      items: [
        { label: "Critical Risk Alerts", desc: "Notify for high-risk tasks immediately" },
        { label: "Weekly Reports", desc: "Send AI-generated weekly summaries" },
        { label: "Team Updates", desc: "Notify on task assignments and completions" },
      ],
    },
  ];

  return (
    <div className="p-4 max-w-md space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
      </div>
      {sections.map(({ section, items }) => (
        <div key={section} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-3xs">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{section}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map((item, i) => {
              const isEnabled = settingsState[item.label as keyof typeof settingsState];

              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                    <p className="text-[10px] text-gray-500">{item.desc}</p>
                  </div>

                  <div
                    onClick={() => toggleSetting(item.label)}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 pointer-events-auto cursor-pointer relative shrink-0 border ${
                      isEnabled ? "bg-[#1A237E] border-[#1A237E]" : "bg-gray-200 border-gray-300"
                    }`}
                  >
                    <motion.div
                      className="absolute top-[1px] w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ x: isEnabled ? 17 : 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const LogoutModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <motion.div
      className="absolute inset-0 bg-black/25 backdrop-blur-sm"
      onClick={onCancel}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    />
    <motion.div
      className="relative bg-white border border-gray-200 rounded-xl p-6 max-w-xs w-full shadow-2xl z-10"
      initial={{ scale: 0.93, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.93, opacity: 0, y: 8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="w-11 h-11 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center mb-4">
        <LogOut size={20} className="text-red-600" />
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1">Sign Out</h3>
      <p className="text-xs text-gray-500 mb-5 leading-relaxed">
        Are you sure you want to sign out? Your session will be invalidated.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-xs font-semibold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </motion.div>
  </div>
);

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const {
    isLoading,
    projects,
    tasks,
    teamMembers,
    unreadCount,
    createProject,
    createTask,
    editTask,
    removeTask,
    inviteToProject,
    getProjectRole,
    canInviteToProject,
    updateTask,
    updateTaskDetails,
    assignTask,
    teams,
  } = useProject();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [workspaceProject, setWorkspaceProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("Personal");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteProject, setInviteProject] = useState<Project | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormMode, setTaskFormMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormProjectId, setTaskFormProjectId] = useState("");

  useEffect(() => {
    if (projects.length > 0 && !activeProject) {
      setActiveProject(projects[0].id);
    }
    if (projects.length > 0 && !taskFormProjectId) {
      setTaskFormProjectId(projects[0].id);
    }
  }, [projects, activeProject, taskFormProjectId]);

  useEffect(() => {
    if (!workspaceProject) return;
    const updated = projects.find((p) => p.id === workspaceProject.id);
    if (updated) setWorkspaceProject(updated);
  }, [projects, workspaceProject?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasks.find((t) => t.id === selectedTask.id);
    if (updated) setSelectedTask(updated);
  }, [tasks, selectedTask?.id]);

  const openProjectWorkspace = (project: Project) => {
    setActiveProject(project.id);
    setWorkspaceProject(project);
    setActivePage("project");
    setTaskFormProjectId(project.id);
  };

  const closeProjectWorkspace = () => {
    setWorkspaceProject(null);
    setActivePage("dashboard");
  };

  const navigateTo = (page: string) => {
    if (page !== "project") setWorkspaceProject(null);
    setActivePage(page);
  };

  const openNewTaskModal = (projectId?: string) => {
    setTaskFormMode("create");
    setEditingTask(null);
    setTaskFormProjectId(projectId ?? workspaceProject?.id ?? projects[0]?.id ?? "");
    setTaskFormOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTask(null);
    setTaskFormMode("edit");
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleTaskFormSubmit = async (values: {
    title: string;
    description: string;
    projectId: string;
    deadline: string;
    priority: Task["priority"];
    status: Task["status"];
  }) => {
    try {
      if (taskFormMode === "create") {
        await createTask(values.projectId, {
          title: values.title,
          description: values.description,
          deadline: values.deadline || undefined,
          priority: values.priority,
        });
        toast.success("Task created");
      } else if (editingTask) {
        await editTask(editingTask.id, {
          title: values.title,
          description: values.description,
          deadline: values.deadline || undefined,
          priority: values.priority,
          status: values.status,
        });
        toast.success("Task updated");
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to save task";
      toast.error(message);
      throw err;
    }
  };

  const handleTaskDelete = async () => {
    if (!editingTask) return;
    try {
      await removeTask(editingTask.id);
      toast.success("Task deleted");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to delete task";
      toast.error(message);
      throw err;
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: Task["status"]) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const progress =
      status === "done" ? 100 : status === "in_progress" || status === "review" ? Math.max(task.progress, 50) : task.progress;
    try {
      await updateTask(taskId, status, progress);
    } catch {
      toast.error("Failed to update task status");
    }
  };

  const handleTaskAssigneeChange = async (task: Task, memberId: string) => {
    try {
      await assignTask(task.id, memberId);
      const member = teamMembers.find((m) => m.id === memberId);
      if (member) {
        setSelectedTask((current) =>
          current?.id === task.id ? { ...current, assignee: member } : current
        );
      }
      toast.success("Assignee updated");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update assignee";
      toast.error(message);
      throw err;
    }
  };

  const handleTaskDetailStatusChange = async (task: Task, status: Task["status"]) => {
    const progress =
      status === "done"
        ? 100
        : status === "in_progress" || status === "review"
          ? Math.max(task.progress, 50)
          : task.progress;

    try {
      await updateTask(task.id, status, progress);
      setSelectedTask((current) =>
        current?.id === task.id ? { ...current, status, progress } : current
      );
      toast.success("Status updated");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update status";
      toast.error(message);
      throw err;
    }
  };

  const handleTaskPriorityChange = async (task: Task, priority: Task["priority"]) => {
    try {
      await updateTaskDetails(task.id, { priority });
      setSelectedTask((current) =>
        current?.id === task.id ? { ...current, priority } : current
      );
      toast.success("Priority updated");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update priority";
      toast.error(message);
      throw err;
    }
  };

  const handleTaskDeadlineChange = async (task: Task, deadline: string) => {
    try {
      await updateTaskDetails(task.id, { deadline });
      setSelectedTask((current) =>
        current?.id === task.id ? { ...current, deadline } : current
      );
      toast.success("Deadline updated");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update deadline";
      toast.error(message);
      throw err;
    }
  };

  const workspaceTasks = workspaceProject
    ? tasks.filter((t) => t.projectId === workspaceProject.id)
    : [];

  const selectedTaskAssignees = (() => {
    if (!selectedTask?.projectId) return teamMembers;
    const project = projects.find((p) => p.id === selectedTask.projectId);
    if (!project?.teamId) return teamMembers;
    const team = teams.find((t) => t.teamId === project.teamId);
    if (!team) return teamMembers;

    const projectMemberIds = new Set(team.members.map((member) => String(member.userId)));
    const options = teamMembers.filter((member) => projectMemberIds.has(member.id));
    if (
      selectedTask.assignee.id !== "0" &&
      !options.some((member) => member.id === selectedTask.assignee.id)
    ) {
      return [selectedTask.assignee, ...options];
    }
    return options;
  })();

  const [showAIChat, setShowAIChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    toast.success("You have been signed out.");
  };

  if (!isAuthenticated) {
    return <PublicGate />;
  }

  if (isLoading && projects.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#1A237E]" size={32} />
      </div>
    );
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    try {
      const newId = await createProject(name, newProjectType);
      setShowNewProjectModal(false);
      setNewProjectName("");
      openProjectWorkspace({
        id: newId,
        name,
        color: "#1E88E5",
        icon: "🚀",
        taskCount: 0,
        riskScore: 20,
        projectType: newProjectType,
      });
      toast.success(newProjectType === "Personal" ? "Personal project created" : "Team project created");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create project";
      toast.error(message);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteProject || !inviteEmail.trim()) return;
    try {
      await inviteToProject(inviteProject.id, inviteEmail.trim());
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteProject(null);
      toast.success("Invitation sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    }
  };

  const userRoleLabel = projects.some((p) => getProjectRole(p.id) === "LEADER")
    ? "Project Leader"
    : "Team Member";

  return (
    <div
      className="h-screen flex overflow-hidden bg-gray-50 relative"
      style={{ fontFamily: "'Inter', 'Roboto', sans-serif" }}
    >
      <Toaster position="top-right" richColors />
      <>
          <motion.div
            className="h-full shrink-0 overflow-hidden"
            animate={{ width: collapsed ? 52 : 220 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <Sidebar
              activeProject={activeProject}
              setActiveProject={setActiveProject}
              activePage={activePage}
              setActivePage={navigateTo}
              collapsed={collapsed}
              onOpenProject={openProjectWorkspace}
              onLogout={() => setShowLogoutModal(true)}
              projects={projects}
              userName={user?.name ?? "User"}
              userRole={userRoleLabel}
              unreadCount={unreadCount}
              onCreateProject={() => setShowNewProjectModal(true)}
            />
          </motion.div>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header
              collapsed={collapsed}
              toggleCollapsed={() => setCollapsed(!collapsed)}
              view={view}
              setView={setView}
              onAIToggle={() => setShowAIChat(!showAIChat)}
              onProfileToggle={() => setShowProfile(true)}
              onNewTaskToggle={() => openNewTaskModal()}
              projectName={activePage === "project" ? workspaceProject?.name : undefined}
              onProjectsClick={closeProjectWorkspace}
            />

            <div className="flex-1 flex overflow-hidden w-full relative">
              <main className="flex-1 overflow-hidden flex flex-col min-w-0">
                <AnimatePresence mode="wait">
                  {activePage === "dashboard" && (
                    <motion.div
                      key="dashboard"
                      className="flex-1 flex flex-col overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <PendingInvitationsBanner />
                      <DashboardSummaryBar />
                      <div className="flex-1 overflow-hidden">
                        <ProjectGrid
                          onSelect={openProjectWorkspace}
                          onInvite={(p) => { setInviteProject(p); setShowInviteModal(true); }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {activePage === "project" && workspaceProject && (
                    <motion.div
                      key={`project-${workspaceProject.id}`}
                      className="flex-1 flex flex-col overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ProjectWorkspace
                        project={workspaceProject}
                        tasks={workspaceTasks}
                        view={view}
                        canInvite={canInviteToProject(workspaceProject.id)}
                        onBack={closeProjectWorkspace}
                        onNewTask={() => openNewTaskModal(workspaceProject.id)}
                        onInvite={() => {
                          setInviteProject(workspaceProject);
                          setShowInviteModal(true);
                        }}
                        onTaskClick={setSelectedTask}
                        onStatusChange={handleTaskStatusChange}
                      />
                    </motion.div>
                  )}

                  {activePage === "reports" && (
                    <motion.div
                      key="reports"
                      className="flex-1 overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ReportsDashboard />
                    </motion.div>
                  )}

                  {activePage === "team" && (
                    <motion.div
                      key="team"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <TeamView />
                    </motion.div>
                  )}

                  {activePage === "notifications" && (
                    <motion.div
                      key="notifications"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <NotificationsView />
                    </motion.div>
                  )}

                  {activePage === "settings" && (
                    <motion.div
                      key="settings"
                      className="flex-1 overflow-y-auto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SettingsView />
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>

              {/* IDE-STYLE RIGHT PANEL AI CONSOLE */}
              <AnimatePresence initial={false}>
                {showAIChat && (
                  <motion.div
                    className="h-full bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: 340 }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                  >
                    <div className="w-[340px] h-full flex flex-col border-l border-gray-100">
                      <div className="p-3.5 border-b border-gray-200 bg-[#1A237E] text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs font-black tracking-wider uppercase">TMAI Assistant Console</span>
                        </div>
                        <button onClick={() => setShowAIChat(false)} className="text-xs font-bold text-blue-200 hover:text-white font-mono">
                          [ESC]
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                        <div className="bg-gray-50 border p-2.5 rounded-lg text-gray-700 leading-relaxed">
                          Chào Leader Huy Pham. Hệ thống AI đã quét toàn bộ 4 dự án hiện tại. Phát hiện **1 rủi ro nghiêm trọng (Critical)** tại tiến độ của dự án *TMAI Platform*. Bạn cần tôi hỗ trợ phân tích ngách nào?
                        </div>
                        <div className="space-y-1.5 pt-2">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggested Actions</div>
                          {[
                            "Analyze Sprint 6 risk factors",
                            "Optimize An Le's task allocation",
                            "Generate weekly status summary report"
                          ].map((pText, idx) => (
                            <button key={idx} className="w-full text-left p-2 rounded bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#1A237E] font-medium transition-colors">
                              ➔ {pText}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 border-t border-gray-200 bg-gray-50/50 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ask AI for patterns..."
                          className="flex-1 bg-white border border-gray-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#1A237E] font-medium"
                        />
                        <button className="bg-[#1A237E] text-white font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider">
                          Send
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>

      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowNewProjectModal(false)} />
          <div className="relative bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl z-10">
            <h3 className="text-sm font-bold mb-1">Create Project</h3>
            <p className="text-[10px] text-gray-500 mb-3">Like Jira: personal workspace or team project with invites.</p>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <input
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                {(["Personal", "Team"] as ProjectType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewProjectType(type)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                      newProjectType === type
                        ? "border-[#1A237E] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-bold text-gray-900">{type}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {type === "Personal" ? "Solo workspace" : "Invite members"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowNewProjectModal(false)} className="px-3 py-1.5 text-xs border rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs bg-[#1A237E] text-white rounded-lg font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && inviteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl z-10">
            <h3 className="text-sm font-bold mb-1">Invite to {inviteProject.name}</h3>
            <p className="text-[10px] text-gray-500 mb-3">Member will receive a pending invitation to accept.</p>
            <form onSubmit={handleInvite} className="space-y-3">
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@company.com"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-3 py-1.5 text-xs border rounded-lg">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs bg-[#1A237E] text-white rounded-lg font-semibold">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POPUP 1: PROFILE CÁ NHÂN LEADER --- */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xs" onClick={() => setShowProfile(false)} />
            <motion.div 
              className="relative bg-white border-2 border-[#1A237E] rounded-xl w-full max-w-md shadow-2xl overflow-hidden z-10 flex flex-col"
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            >
              <div className="p-4 bg-[#1A237E] text-white flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider">Executive Operator Passport</span>
                <button onClick={() => setShowProfile(false)} className="text-xs font-mono opacity-70 hover:opacity-100">[X]</button>
              </div>
              <div className="p-5 flex flex-col items-center border-b border-gray-100">
                <div className="w-16 h-16 rounded-lg bg-gray-200 mb-3 overflow-hidden border border-gray-300">
                  <img src="https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100" alt="Huy Pham" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{user?.name ?? "User"}</h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md mt-1 font-mono uppercase">
                  {userRoleLabel}
                </span>
              </div>
              <div className="p-4 bg-gray-50/50 space-y-3 text-xs flex-1">
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">AI Management Indices</div>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="bg-white border p-2 rounded">
                      <div className="text-[9px] text-gray-400">RISK MITIGATION RATE</div>
                      <div className="text-sm font-black text-green-600">88.4%</div>
                    </div>
                    <div className="bg-white border p-2 rounded">
                      <div className="text-[9px] text-gray-400">RESOURCE HEALTH IDX</div>
                      <div className="text-sm font-black text-blue-700">92.1%</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Project Authority Map</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center bg-white p-1.5 border rounded">
                      <span className="font-bold text-gray-800">TMAI PLATFORM</span>
                      <span className="text-[9px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-100">LEAD DIRECTOR</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-1.5 border rounded">
                      <span className="font-bold text-gray-800">MOBILE APP ECOSYSTEM</span>
                      <span className="text-[9px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded border">CORE AUDITOR</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TaskFormModal
        open={taskFormOpen}
        mode={taskFormMode}
        projects={projects}
        initial={
          taskFormMode === "edit" && editingTask
            ? taskToFormValues(editingTask)
            : { projectId: taskFormProjectId }
        }
        onClose={() => {
          setTaskFormOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleTaskFormSubmit}
        onDelete={taskFormMode === "edit" ? handleTaskDelete : undefined}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={openEditTaskModal}
        assigneeOptions={selectedTaskAssignees}
        onAssigneeChange={handleTaskAssigneeChange}
        onStatusChange={handleTaskDetailStatusChange}
        onPriorityChange={handleTaskPriorityChange}
        onDeadlineChange={handleTaskDeadlineChange}
        onProgressUpdate={(task, progress) => {
          updateTask(task.id, task.status, progress);
        }}
      />

      {/* Logout Confirmation Modal (Screen 9) */}
      <AnimatePresence>
        {showLogoutModal && (
          <LogoutModal
            onConfirm={handleLogout}
            onCancel={() => setShowLogoutModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
