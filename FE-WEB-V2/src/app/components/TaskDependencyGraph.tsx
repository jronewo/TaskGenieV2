import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Loader2, AlertTriangle, CircleCheck, CirclePlay, CircleDashed, RefreshCw, Network,
} from "lucide-react";
import { taskApi, DependencyGraphDto, DependencyGraphNode } from "../services/taskApi";
import { ApiError } from "../services/apiClient";
import { usePreferences } from "../settings/PreferencesContext";

/** Card geometry. Positions are computed, not measured, so the drawing never races layout. */
const NODE_W = 190;
const NODE_H = 68;
const COL_GAP = 92;
const ROW_GAP = 26;
const PAD = 28;

/**
 * State colours. Each one ships with its own icon and wording in the legend and on the card, so
 * the diagram is never readable by colour alone.
 */
/** `label` is a translation key, not a string: this table is module-level, so it cannot call t(). */
const STATE = {
  cycle: { fill: "#FEE2E2", stroke: "#DC2626", text: "#991B1B", label: "graph.legend.cycle", Icon: AlertTriangle },
  done: { fill: "#D1FAE5", stroke: "#10B981", text: "#065F46", label: "graph.legend.done", Icon: CircleCheck },
  ready: { fill: "#DBEAFE", stroke: "#2563EB", text: "#1E3A8A", label: "graph.legend.ready", Icon: CirclePlay },
  blocked: { fill: "#F1F5F9", stroke: "#94A3B8", text: "#475569", label: "graph.legend.blocked", Icon: CircleDashed },
} as const;

type StateKey = keyof typeof STATE;

function stateOf(node: DependencyGraphNode): StateKey {
  if (node.inCycle) return "cycle";
  if ((node.status ?? "") === "Done") return "done";
  if (node.isReady) return "ready";
  return "blocked";
}

interface Placed extends DependencyGraphNode {
  x: number;
  y: number;
}

/** Columns are levels; rows are the tasks sharing a level, which can be worked in parallel. */
function layout(nodes: DependencyGraphNode[]): { placed: Placed[]; width: number; height: number } {
  const byLevel = new Map<number, DependencyGraphNode[]>();
  nodes.forEach((n) => {
    const list = byLevel.get(n.level) ?? [];
    list.push(n);
    byLevel.set(n.level, list);
  });

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const placed: Placed[] = [];
  let tallest = 0;

  levels.forEach((level, column) => {
    // Stable order inside a column: the tasks holding up the most work sit at the top.
    const rows = (byLevel.get(level) ?? []).sort(
      (a, b) => b.blocksCount - a.blocksCount || a.title.localeCompare(b.title)
    );
    rows.forEach((node, row) => {
      placed.push({
        ...node,
        x: PAD + column * (NODE_W + COL_GAP),
        y: PAD + row * (NODE_H + ROW_GAP),
      });
    });
    tallest = Math.max(tallest, rows.length);
  });

  return {
    placed,
    width: PAD * 2 + levels.length * NODE_W + Math.max(0, levels.length - 1) * COL_GAP,
    height: PAD * 2 + tallest * NODE_H + Math.max(0, tallest - 1) * ROW_GAP,
  };
}

interface Props {
  open: boolean;
  projectId: number | null;
  projectName?: string | null;
  onClose: () => void;
  /** Opens a task from the diagram, so the graph is a way in rather than a dead end. */
  onOpenTask?: (taskId: number) => void;
}

/**
 * Which tasks have to be finished before which.
 *
 * Laid out left to right by dependency depth: everything in the first column can be started today,
 * and nothing in a column can begin until the columns to its left are done. A board sorted by
 * status cannot show this — it says what state work is in, never what is waiting on what.
 */
export const TaskDependencyGraph = ({ open, projectId, projectName, onClose, onOpenTask }: Props) => {
  const { t } = usePreferences();
  const [graph, setGraph] = useState<DependencyGraphDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (projectId == null) return;
    setLoading(true);
    setError(null);
    try {
      setGraph(await taskApi.dependencyGraph(projectId));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || `Request failed (${err.status}).`
          : t("graph.loadFailed")
      );
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const { placed, width, height } = useMemo(
    () => (graph ? layout(graph.nodes) : { placed: [], width: 0, height: 0 }),
    [graph]
  );

  const positions = useMemo(
    () => new Map(placed.map((n) => [n.id, n])),
    [placed]
  );

  // Hovering a task highlights only the edges it takes part in — otherwise a dense graph is a
  // ball of string and you cannot follow one chain.
  const isEdgeLit = (source: string, target: string) =>
    hovered != null && (hovered === source || hovered === target);

  const readyCount = graph?.nodes.filter((n) => stateOf(n) === "ready").length ?? 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={t("graph.dialogLabel")}
        >
          <motion.div
            className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-xl border border-gray-200 bg-white"
            initial={{ scale: 0.97, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 8 }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Network size={15} className="text-[#1A237E]" aria-hidden />
                  {t("graph.title")}
                </h2>
                <p className="mt-0.5 text-[10px] text-gray-500">
                  {projectName ? `${projectName} · ` : ""}
                  {t("graph.subtitle")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  aria-label={t("graph.reload")}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                >
                  <RefreshCw size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
            </header>

            {/* Identity is never colour alone: every state carries its icon and its name here. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-gray-200 px-5 py-2">
              {(Object.keys(STATE) as StateKey[]).map((key) => {
                const s = STATE[key];
                const Icon = s.Icon;
                return (
                  <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-gray-600">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm border"
                      style={{ background: s.fill, borderColor: s.stroke }}
                      aria-hidden
                    />
                    <Icon size={11} style={{ color: s.stroke }} aria-hidden />
                    {t(s.label)}
                  </span>
                );
              })}
              {graph && (
                <span className="ml-auto text-[10px] text-gray-500">
                  {t("graph.summaryFull", { tasks: graph.nodes.length, waves: graph.levelCount, ready: readyCount })}
                </span>
              )}
            </div>

            {graph?.hasCycle && (
              <div
                role="alert"
                className="mx-5 mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {t("graph.cycleTitle")} {t("graph.cycleDetail")}
                </span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto p-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-xs text-gray-500">
                  <Loader2 size={14} className="animate-spin" aria-hidden /> {t("graph.building")}
                </div>
              ) : error ? (
                <div role="alert" className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              ) : !graph || graph.nodes.length === 0 ? (
                <p className="py-24 text-center text-xs text-gray-500">{t("graph.empty")}</p>
              ) : (
                <svg
                  width={Math.max(width, 320)}
                  height={Math.max(height, 200)}
                  role="img"
                  aria-label={t("graph.exportLabel", { count: graph.nodes.length, project: projectName ?? "" })}
                  className="tg-depgraph"
                >
                  <defs>
                    <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
                    </marker>
                    <marker id="dep-arrow-lit" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#1A237E" />
                    </marker>
                  </defs>

                  {/* Edges first so cards sit above them. */}
                  {graph.edges.map((edge) => {
                    const from = positions.get(edge.source);
                    const to = positions.get(edge.target);
                    if (!from || !to) return null;

                    const x1 = from.x + NODE_W;
                    const y1 = from.y + NODE_H / 2;
                    const x2 = to.x;
                    const y2 = to.y + NODE_H / 2;
                    const mid = (x1 + x2) / 2;
                    const lit = isEdgeLit(edge.source, edge.target);

                    return (
                      <path
                        key={edge.id}
                        d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke={lit ? "#1A237E" : "#94A3B8"}
                        strokeWidth={lit ? 2.5 : 1.5}
                        // A settled prerequisite is history; a dashed line says this one still holds work up.
                        strokeDasharray={edge.isBlocking ? "5 4" : undefined}
                        markerEnd={`url(#${lit ? "dep-arrow-lit" : "dep-arrow"})`}
                        opacity={hovered && !lit ? 0.25 : 1}
                      />
                    );
                  })}

                  {placed.map((node) => {
                    const s = STATE[stateOf(node)];
                    const dim = hovered != null && hovered !== node.id;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onMouseEnter={() => setHovered(node.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => onOpenTask?.(Number(node.id))}
                        style={{ cursor: onOpenTask ? "pointer" : "default" }}
                        opacity={dim ? 0.45 : 1}
                      >
                        <title>
                          {`${node.title}\n${t(s.label)}` +
                            (node.blockedByCount > 0 ? `\n${t("graph.waitingOn", { count: node.blockedByCount })}` : "") +
                            (node.blocksCount > 0 ? `\n${t("graph.blocks", { count: node.blocksCount })}` : "") +
                            (node.assigneeName ? `\n${node.assigneeName}` : "") +
                            (node.deadline ? `\n${t("graph.deadline", { date: node.deadline })}` : "")}
                        </title>
                        <rect
                          width={NODE_W}
                          height={NODE_H}
                          rx={8}
                          fill={s.fill}
                          stroke={s.stroke}
                          strokeWidth={node.inCycle ? 2 : 1.25}
                        />
                        <text x={12} y={22} fontSize={11.5} fontWeight={600} fill={s.text}>
                          {node.title.length > 24 ? `${node.title.slice(0, 23)}…` : node.title}
                        </text>
                        <text x={12} y={39} fontSize={9.5} fill={s.text} opacity={0.8}>
                          {t(s.label)}
                          {node.deadline ? ` · ${node.deadline}` : ""}
                        </text>
                        <text x={12} y={56} fontSize={9} fill={s.text} opacity={0.7}>
                          {node.blockedByCount > 0
                            ? t("graph.waitingShort", { count: node.blockedByCount })
                            : t("graph.waitingOnNobody")}
                          {node.blocksCount > 0 ? t("graph.blocksShort", { count: node.blocksCount }) : ""}
                        </text>
                        <text x={NODE_W - 10} y={22} fontSize={9} textAnchor="end" fill={s.text} opacity={0.6}>
                          {t("graph.wave", { n: node.level + 1 })}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            <footer className="border-t border-gray-200 px-5 py-2 text-[10px] text-gray-500">
              {t("graph.footer")}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
