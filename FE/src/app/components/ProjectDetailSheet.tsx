import React from "react";
import { AlertTriangle, CheckCircle, Circle, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./ui/accordion";
import { Project, Task, RiskLevel } from "../data/tmaiData";
import { useProject } from "../../context/ProjectContext";

interface ProjectDetailSheetProps {
  project: Project | null;
  onClose: () => void;
}

const riskLabel: Record<RiskLevel, string> = {
  safe: "Safe",
  medium: "At Risk",
  high: "High Risk",
  critical: "Critical",
};

const statusLabel: Record<Task["status"], string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
};

function TaskRow({ task }: { task: Task }) {
  const isCritical = task.risk === "critical";
  const isHigh = task.risk === "high";
  const isDone = task.status === "done";

  return (
    <div
      className={`flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-0 ${
        isCritical ? "bg-red-50/60 -mx-4 px-4" : ""
      }`}
    >
      {isDone ? (
        <CheckCircle size={12} className="text-gray-400 shrink-0" />
      ) : (
        <Circle size={12} className="text-gray-300 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <div
          className={`text-xs font-medium truncate ${
            isCritical
              ? "text-red-700 animate-pulse"
              : isDone
              ? "text-gray-400 line-through"
              : "text-gray-800"
          }`}
        >
          {isCritical && (
            <AlertTriangle size={10} className="inline mr-1 text-red-500 shrink-0" />
          )}
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock size={9} className="text-gray-300 shrink-0" />
          <span className="text-[10px] text-gray-400">
            {new Date(task.deadline).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-[10px] text-gray-400">{statusLabel[task.status]}</span>
          <span className="text-[10px] text-gray-400">{task.storyPoints} pts</span>
        </div>
      </div>

      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
          isCritical
            ? "bg-red-100 text-red-700"
            : isHigh
            ? "bg-amber-100 text-amber-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {riskLabel[task.risk]}
      </span>
    </div>
  );
}

export function ProjectDetailSheet({ project, onClose }: ProjectDetailSheetProps) {
  const { tasks, teamMembers } = useProject();
  const projectTasks = project ? tasks.filter((t) => t.projectId === project.id) : [];
  const isOpen = !!project;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-[520px] p-0 gap-0 flex flex-col"
      >
        {project && (
          <>
            {/* Sheet Header */}
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-gray-200 pr-12 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center text-lg"
                  style={{ background: "#F1F5F9" }}
                >
                  {project.icon}
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold text-gray-900">
                    {project.name}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-gray-500 mt-0">
                    {project.taskCount} tasks · Risk Score:{" "}
                    <span
                      className={`font-medium ${
                        project.riskScore >= 70
                          ? "text-red-600"
                          : project.riskScore >= 40
                          ? "text-amber-600"
                          : "text-gray-600"
                      }`}
                    >
                      {project.riskScore}
                    </span>
                  </SheetDescription>
                </div>
              </div>

              {/* Sub-projects row */}
              {project.children && project.children.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {project.children.map((child) => (
                    <span
                      key={child.id}
                      className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {child.icon} {child.name} · {child.taskCount}
                    </span>
                  ))}
                </div>
              )}
            </SheetHeader>

            {/* Team Members Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Team Members
                </p>
              </div>

              <Accordion type="multiple" className="divide-y divide-gray-100">
                {teamMembers.map((member) => {
                  const memberTasks = projectTasks.filter(
                    (t) => t.assignee.id === member.id
                  );
                  const hasCritical = memberTasks.some(
                    (t) => t.risk === "critical"
                  );
                  const hasHigh = memberTasks.some((t) => t.risk === "high");
                  const doneCount = memberTasks.filter(
                    (t) => t.status === "done"
                  ).length;

                  return (
                    <AccordionItem key={member.id} value={member.id} className="border-b-0">
                      <AccordionTrigger className="px-5 py-3 hover:bg-gray-50 hover:no-underline transition-colors">
                        <div className="flex items-center gap-3 flex-1 mr-2">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-md object-cover shrink-0"
                          />
                          <div className="text-left min-w-0">
                            <div className="text-xs font-semibold text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {member.role} · {doneCount}/{memberTasks.length} done
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-1.5 shrink-0">
                            {hasCritical && (
                              <AlertTriangle size={12} className="text-red-500" />
                            )}
                            {!hasCritical && hasHigh && (
                              <AlertTriangle size={12} className="text-amber-500" />
                            )}
                            <span className="text-[10px] text-gray-400">
                              {memberTasks.length} tasks
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-5 pb-0 pt-0 bg-gray-50/30">
                        {memberTasks.length === 0 ? (
                          <p className="text-[11px] text-gray-400 py-3">
                            No tasks assigned.
                          </p>
                        ) : (
                          <div>
                            {memberTasks.map((task) => (
                              <TaskRow key={task.id} task={task} />
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
