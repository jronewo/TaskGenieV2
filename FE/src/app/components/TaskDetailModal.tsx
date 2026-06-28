import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Sparkles, Clock, MessageSquare, Paperclip, Tag,
  ChevronRight, User, BarChart2, Flame, AlertTriangle,
  CheckCircle, Circle, Plus, Send, Star, Zap, TrendingUp,
  ArrowRight, Brain, Target, Shield
} from "lucide-react";
import { Task, aiSuggestedMembers } from "../data/tmaiData";
import { RadialBarChart, RadialBar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
}

const RiskGauge = ({ score }: { score: number }) => {
  const angle = (score / 100) * 180;
  const getColor = () => {
    if (score < 30) return "#10B981";
    if (score < 60) return "#F59E0B";
    if (score < 80) return "#EF4444";
    return "#DC2626";
  };

  const getLabel = () => {
    if (score < 30) return "Low Risk";
    if (score < 60) return "Moderate";
    if (score < 80) return "High Risk";
    return "Critical";
  };

  const segments = [
    { value: 30, color: "#10B981" },
    { value: 30, color: "#F59E0B" },
    { value: 20, color: "#EF4444" },
    { value: 20, color: "#DC2626" },
  ];

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-44 h-24">
        {/* Gauge background arc */}
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Green segment */}
          <path
            d="M 20 100 A 80 80 0 0 1 68 34"
            fill="none"
            stroke="#10B981"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Yellow segment */}
          <path
            d="M 68 34 A 80 80 0 0 1 132 34"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="14"
            opacity="0.8"
          />
          {/* Red segment */}
          <path
            d="M 132 34 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#EF4444"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Needle */}
          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: -90 + angle }}
            style={{ transformOrigin: "100px 100px" }}
          >
            <line
              x1="100" y1="100"
              x2="100" y2="28"
              stroke={getColor()}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </motion.g>
          {/* Center dot */}
          <circle cx="100" cy="100" r="6" fill={getColor()} />
          <circle cx="100" cy="100" r="3" fill="white" />
        </svg>
      </div>
      <motion.div
        className="text-3xl font-bold mt-0"
        style={{ color: getColor() }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.3 }}
      >
        {score}
      </motion.div>
      <div
        className="text-xs font-semibold mt-1 px-3 py-1 rounded-full"
        style={{ color: getColor(), background: `${getColor()}20` }}
      >
        {getLabel()}
      </div>
    </div>
  );
};

export const TaskDetailModal = ({ task, onClose }: TaskDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "activity">("overview");
  const [newComment, setNewComment] = useState("");

  if (!task) return null;

  const completedSubtasks = task.subtasks?.filter(s => s.done).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const tabs = [
    { id: "overview", label: "Overview", icon: Target },
    { id: "ai", label: "AI Analysis", icon: Brain },
    { id: "activity", label: "Activity", icon: MessageSquare },
  ];

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div
              className="px-6 pt-6 pb-4 relative"
              style={{ background: "linear-gradient(135deg, #1A237E 0%, #283593 100%)" }}
            >
              {/* Decorative orbs */}
              <div className="absolute top-0 right-16 w-32 h-32 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #7C4DFF, transparent)" }} />
              <div className="absolute bottom-0 left-8 w-20 h-20 rounded-full opacity-10"
                style={{ background: "radial-gradient(circle, #1E88E5, transparent)" }} />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">#{task.id}</span>
                    <span className="text-blue-400">·</span>
                    <span className="text-xs text-blue-300">{task.storyPoints} story points</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-3 leading-tight">{task.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map(tag => (
                      <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 text-blue-100 border border-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white ml-4"
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-all ${
                      activeTab === id
                        ? "bg-white text-gray-800"
                        : "text-blue-200 hover:text-white hover:bg-white/10"
                    }`}
                    onClick={() => setActiveTab(id as typeof activeTab)}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon size={14} />
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5"
                  >
                    {/* Left: Main Info */}
                    <div className="md:col-span-2 space-y-5">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                      </div>

                      {task.subtasks && task.subtasks.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Subtasks ({completedSubtasks}/{totalSubtasks})
                            </h4>
                            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-blue-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            {task.subtasks.map(sub => (
                              <motion.div
                                key={sub.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                                  sub.done ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
                                }`}
                                whileHover={{ x: 2 }}
                              >
                                {sub.done
                                  ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                                  : <Circle size={16} className="text-gray-300 shrink-0" />
                                }
                                <span className={`text-sm ${sub.done ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                  {sub.title}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</h4>
                          <span className="text-sm font-bold text-gray-800">{task.progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: "linear-gradient(90deg, #7C4DFF, #1E88E5)",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Meta */}
                    <div className="space-y-4">
                      {[
                        {
                          label: "Assignee",
                          content: (
                            <div className="flex items-center gap-2">
                              <img src={task.assignee.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                              <div>
                                <div className="text-xs font-semibold text-gray-800">{task.assignee.name}</div>
                                <div className="text-[10px] text-gray-500">{task.assignee.role}</div>
                              </div>
                            </div>
                          ),
                        },
                        {
                          label: "Deadline",
                          content: (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock size={14} className="text-gray-400" />
                              {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          ),
                        },
                        {
                          label: "Priority",
                          content: (
                            <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full ${
                              task.priority === "urgent" ? "bg-red-100 text-red-600" :
                              task.priority === "high" ? "bg-orange-100 text-orange-600" :
                              task.priority === "medium" ? "bg-blue-100 text-blue-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {task.priority}
                            </span>
                          ),
                        },
                        {
                          label: "Status",
                          content: (
                            <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                              {task.status.replace("_", " ")}
                            </span>
                          ),
                        },
                      ].map(({ label, content }) => (
                        <div key={label}>
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{label}</div>
                          {content}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === "ai" && (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Risk Gauge */}
                      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield size={15} className="text-purple-600" />
                          <h4 className="text-sm font-bold text-gray-800">Risk Prediction</h4>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">AI-powered risk assessment</p>
                        <RiskGauge score={task.riskScore} />
                        <div className="grid grid-cols-4 gap-1 mt-2">
                          {["Safe", "Moderate", "High", "Critical"].map((l, i) => (
                            <div key={l} className="text-center">
                              <div className="h-1 rounded-full mb-1" style={{
                                background: ["#10B981", "#F59E0B", "#EF4444", "#DC2626"][i]
                              }} />
                              <span className="text-[9px] text-gray-500">{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Insight Card */}
                      <div
                        className="rounded-2xl p-5 border"
                        style={{
                          background: "linear-gradient(135deg, rgba(124,77,255,0.06) 0%, rgba(30,136,229,0.06) 100%)",
                          borderColor: "rgba(124,77,255,0.2)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles size={15} className="text-purple-600" />
                          </motion.div>
                          <h4 className="text-sm font-bold text-gray-800">AI Insight</h4>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-4">{task.aiInsight}</p>
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recommendations</div>
                          {[
                            "Break task into smaller subtasks",
                            "Add a second developer for backup",
                            "Request deadline extension if needed",
                          ].map((rec, i) => (
                            <motion.div
                              key={i}
                              className="flex items-start gap-2 text-xs text-purple-800"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <ArrowRight size={12} className="text-purple-400 mt-0.5 shrink-0" />
                              {rec}
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Team Suggestions */}
                      <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp size={15} className="text-blue-600" />
                          <h4 className="text-sm font-bold text-gray-800">AI-Suggested Team Members</h4>
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full ml-auto font-medium">
                            Based on skills & availability
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {aiSuggestedMembers.map(({ member, score, reason }, i) => (
                            <motion.div
                              key={member.id}
                              className="p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              whileHover={{ y: -2 }}
                            >
                              <div className="relative mb-2">
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-10 h-10 rounded-xl object-cover"
                                />
                                <div
                                  className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                  style={{
                                    background: score >= 95 ? "#10B981" : score >= 85 ? "#1E88E5" : "#7C4DFF",
                                  }}
                                >
                                  {score}%
                                </div>
                              </div>
                              <div className="text-xs font-semibold text-gray-800 truncate">{member.name}</div>
                              <div className="text-[10px] text-gray-500 mb-1">{member.role}</div>
                              <div className="text-[10px] text-blue-600 line-clamp-2 leading-tight">{reason}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {member.skills.slice(0, 2).map(skill => (
                                  <span key={skill} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "activity" && (
                  <motion.div
                    key="activity"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-6"
                  >
                    <div className="space-y-4">
                      {[
                        { user: "An Le", avatar: "https://images.unsplash.com/photo-1763128516808-785e80c1dd68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100", action: "updated the risk score from 65 to 88", time: "2 hours ago", type: "update" },
                        { user: "Minh Tran", avatar: "https://images.unsplash.com/photo-1762753674498-73ec49feafc4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100", action: "Added comment: 'Need to fix accuracy on edge cases'", time: "5 hours ago", type: "comment" },
                        { user: "AI Engine", avatar: null, action: "detected deadline conflict and sent alert", time: "6 hours ago", type: "ai" },
                        { user: "Linh Nguyen", avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100", action: "completed subtask: Model training loop", time: "1 day ago", type: "complete" },
                      ].map((activity, i) => (
                        <motion.div
                          key={i}
                          className="flex gap-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {activity.avatar ? (
                            <img src={activity.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: "linear-gradient(135deg, #7C4DFF, #1E88E5)" }}>
                              <Sparkles size={14} className="text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">{activity.user}</span> {activity.action}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Comment input */}
                    <div className="mt-6 flex gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1601513043334-36a0088140d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=100"
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                        <input
                          className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                        />
                        <motion.button
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ background: newComment ? "linear-gradient(135deg, #7C4DFF, #1E88E5)" : "#E5E7EB" }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Send size={13} className={newComment ? "text-white" : "text-gray-400"} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
