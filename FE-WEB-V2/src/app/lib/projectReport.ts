import { ProjectDto } from "../services/projectApi";
import { TaskDetailDto } from "../services/taskApi";
import { TeamMemberDto } from "../services/teamApi";
import { issueKey, projectKey } from "./jira";

/**
 * The closure report for a finished project — the "Báo cáo tiến độ dự án" document.
 *
 * Every figure is derived from rows the API already returned; there is no report endpoint and no
 * sample series, so a number that is not in the task list does not appear in the PDF.
 *
 * "Late" is deliberately two different questions:
 *  - a finished task is late when it was completed after its own deadline;
 *  - an unfinished task is late when the project closed after its deadline had passed.
 * Collapsing them would let a project close with untouched overdue work and still report 100%.
 */

export interface LateTaskRow {
  taskId: number;
  code: string;
  title: string;
  owners: string;
  deadline: Date;
  /** Null when the task was never finished. */
  completedAt: Date | null;
  daysLate: number;
}

/**
 * One placed bar on the closure report's Gantt. Every task that carries at least one usable date
 * gets a row: an explicit StartDate/Deadline pair is drawn as-is, and a task missing one or both is
 * still placed from whatever it has (created date, completion date) and flagged `estimated`.
 */
export interface GanttTaskRow {
  taskId: number;
  title: string;
  status: string;
  /** 0–100. */
  progress: number;
  start: Date;
  end: Date;
  /** True when the start and/or end had to be inferred because the task lacked an explicit start date or deadline. */
  estimated: boolean;
}

export interface GanttData {
  /** Sorted by start date, then end date. */
  rows: GanttTaskRow[];
  rangeStart: Date;
  rangeEnd: Date;
  /** One tick every 7 days from rangeStart, for the timeline grid and axis labels. */
  weekTicks: Date[];
  /** Drawn rows whose start or end was inferred. */
  estimatedCount: number;
  /** Tasks with no usable date at all — they cannot be placed and are only counted. */
  undatedCount: number;
}

export interface MemberReportRow {
  userId: number;
  userName: string;
  role: string;
  assignedTasks: number;
  doneTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  /** Share of assigned tasks that were not late, 0–100. */
  onTimeRate: number;
  /** Mean days late across this member's late tasks; 0 when none. */
  averageDaysLate: number;
}

export interface ProjectReport {
  project: ProjectDto;
  projectCode: string;
  /** Team member holding LEADER on the project's team, when it can be resolved. */
  projectManager: string;
  startedOn: Date | null;
  /** Date the project was closed, or today when it is still open. */
  closedOn: Date;
  plannedDeadline: Date | null;
  /** "EARLY" | "ON_TIME" | "LATE" | "NO_PLAN" */
  scheduleVerdict: "EARLY" | "ON_TIME" | "LATE" | "NO_PLAN";
  /** Days past the planned deadline; 0 when on time, null when the project had no deadline. */
  daysOverdue: number | null;
  /** Days remaining at closure when it finished early; null when there was no deadline. */
  daysEarly: number | null;

  totalTasks: number;
  doneTasks: number;
  unfinishedTasks: number;
  onTimeTasks: number;
  lateTasks: number;
  /** Unfinished tasks whose deadline had already passed when the project closed. */
  overdueUnfinishedTasks: number;
  /** Tasks carrying no deadline at all — they can be neither on time nor late. */
  tasksWithoutDeadline: number;
  completionRate: number;
  onTimeRate: number;
  lateRate: number;

  members: MemberReportRow[];
  roleCount: number;
  bestPerformer: MemberReportRow | null;
  mostLate: MemberReportRow | null;
  highestWorkload: MemberReportRow | null;

  lateTaskRows: LateTaskRow[];
  averageDaysLate: number;
  longestDelay: number;

  /** The project timeline, or null when no task has both a start date and a deadline. */
  gantt: GanttData | null;
}

const UNASSIGNED_ID = -1;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days between two dates, ignoring the time of day. */
function dayDiff(later: Date, earlier: Date): number {
  const a = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const b = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** Days a task ran past its deadline; 0 or less means it was not late. */
function daysLateFor(task: TaskDetailDto, closedOn: Date): number {
  const deadline = parseDate(task.deadline);
  if (!deadline) return 0;
  // A task marked Done with no completion timestamp is treated as finished at closing time.
  const finishedAt = task.status === "Done" ? parseDate(task.completedAt) ?? closedOn : closedOn;
  return Math.max(0, dayDiff(finishedAt, deadline));
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Midnight copy of a date, so day-level comparisons ignore any time component. */
function dateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/**
 * Every task placed on a timeline for the closure report.
 *
 * A task with both an explicit StartDate and Deadline is drawn as planned. A task missing one or
 * both is still placed from whatever dates it has — created date, completion date, or the single
 * date it does carry — and marked `estimated` so the chart can show it differently. Only a task
 * with no date at all (no start, no deadline, no created, no completed) is left off and counted.
 */
function buildGantt(tasks: TaskDetailDto[]): GanttData | null {
  const rows: GanttTaskRow[] = [];
  let undatedCount = 0;

  for (const task of tasks) {
    const explicitStart = parseDate(task.startDate);
    const explicitEnd = parseDate(task.deadline);
    const created = parseDate(task.createdAt);
    const completed = parseDate(task.completedAt);

    // Any single date is enough to place the task; without one it cannot go on the timeline.
    const anchor = explicitStart ?? explicitEnd ?? completed ?? created;
    if (!anchor) {
      undatedCount += 1;
      continue;
    }

    let start = dateOnly(explicitStart ?? created ?? anchor);
    let end = dateOnly(explicitEnd ?? completed ?? anchor);
    if (end.getTime() < start.getTime()) end = start;

    rows.push({
      taskId: task.taskId,
      title: task.title ?? `Task #${task.taskId}`,
      status: task.status ?? "Todo",
      progress: Math.min(100, Math.max(0, task.progress ?? 0)),
      start,
      end,
      estimated: !explicitStart || !explicitEnd,
    });
  }

  if (rows.length === 0) return null;

  rows.sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());

  const rangeStart = rows.reduce((min, r) => (r.start < min ? r.start : min), rows[0].start);
  const rangeEnd = rows.reduce((max, r) => (r.end > max ? r.end : max), rows[0].end);

  const weekTicks: Date[] = [];
  for (
    let tick = new Date(rangeStart);
    tick.getTime() <= rangeEnd.getTime();
    tick = new Date(tick.getFullYear(), tick.getMonth(), tick.getDate() + 7)
  ) {
    weekTicks.push(new Date(tick));
  }

  return {
    rows,
    rangeStart,
    rangeEnd,
    weekTicks,
    estimatedCount: rows.filter((r) => r.estimated).length,
    undatedCount,
  };
}

const ROLE_LABELS: Record<string, string> = {
  LEADER: "Trưởng nhóm",
  MEMBER: "Thành viên",
};

export function buildProjectReport(
  project: ProjectDto,
  tasks: TaskDetailDto[],
  teamMembers: TeamMemberDto[] = []
): ProjectReport {
  const closedOn = parseDate(project.updatedAt) ?? new Date();
  const startedOn = parseDate(project.createdAt);
  const plannedDeadline = parseDate(project.deadline);

  let scheduleVerdict: ProjectReport["scheduleVerdict"] = "NO_PLAN";
  let daysOverdue: number | null = null;
  let daysEarly: number | null = null;
  if (plannedDeadline) {
    const diff = dayDiff(closedOn, plannedDeadline);
    scheduleVerdict = diff > 0 ? "LATE" : diff === 0 ? "ON_TIME" : "EARLY";
    daysOverdue = Math.max(0, diff);
    daysEarly = Math.max(0, -diff);
  }

  const lateDays = new Map(tasks.map((t) => [t.taskId, daysLateFor(t, closedOn)] as const));
  const isLate = (t: TaskDetailDto) => (lateDays.get(t.taskId) ?? 0) > 0;

  const withDeadline = tasks.filter((t) => parseDate(t.deadline) !== null);
  const lateTasks = withDeadline.filter(isLate).length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;

  const roleOf = new Map<number, string>();
  let projectManager = "—";
  for (const member of teamMembers) {
    if (member.userId == null) continue;
    roleOf.set(member.userId, ROLE_LABELS[(member.role ?? "").toUpperCase()] ?? member.role ?? "Thành viên");
    if ((member.role ?? "").toUpperCase() === "LEADER" && projectManager === "—") {
      projectManager = member.userName ?? `User #${member.userId}`;
    }
  }

  interface Accumulator extends MemberReportRow {
    totalLateDays: number;
  }
  const members = new Map<number, Accumulator>();
  const touch = (userId: number, userName: string): Accumulator => {
    const existing = members.get(userId);
    if (existing) return existing;
    const row: Accumulator = {
      userId,
      userName,
      role: userId === UNASSIGNED_ID ? "—" : roleOf.get(userId) ?? "Thành viên",
      assignedTasks: 0,
      doneTasks: 0,
      onTimeTasks: 0,
      lateTasks: 0,
      onTimeRate: 0,
      averageDaysLate: 0,
      totalLateDays: 0,
    };
    members.set(userId, row);
    return row;
  };

  const lateTaskRows: LateTaskRow[] = [];

  for (const task of tasks) {
    // Unassigned work still has to appear, otherwise the task counts would not add up.
    const holders =
      task.assignees.length > 0
        ? task.assignees.map((a) => ({ id: a.userId, name: a.userName ?? `User #${a.userId}` }))
        : [{ id: UNASSIGNED_ID, name: "Chưa phân công" }];

    const late = isLate(task);
    const days = lateDays.get(task.taskId) ?? 0;

    for (const holder of holders) {
      const row = touch(holder.id, holder.name);
      row.assignedTasks += 1;
      if (task.status === "Done") row.doneTasks += 1;
      if (late) {
        row.lateTasks += 1;
        row.totalLateDays += days;
      } else {
        row.onTimeTasks += 1;
      }
    }

    if (late) {
      const deadline = parseDate(task.deadline)!;
      lateTaskRows.push({
        taskId: task.taskId,
        code: issueKey(project.name, task.taskId),
        title: task.title ?? `Task #${task.taskId}`,
        owners: holders.map((h) => h.name).join(", "),
        deadline,
        completedAt: task.status === "Done" ? parseDate(task.completedAt) : null,
        daysLate: days,
      });
    }
  }

  const memberRows: MemberReportRow[] = [...members.values()]
    .map(({ totalLateDays, ...row }) => ({
      ...row,
      onTimeRate: row.assignedTasks === 0 ? 0 : round1((row.onTimeTasks / row.assignedTasks) * 100),
      averageDaysLate: row.lateTasks === 0 ? 0 : round1(totalLateDays / row.lateTasks),
    }))
    .sort((a, b) => b.assignedTasks - a.assignedTasks || a.userName.localeCompare(b.userName));

  lateTaskRows.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  const totalLateDays = lateTaskRows.reduce((sum, row) => sum + row.daysLate, 0);
  const rated = memberRows.filter((m) => m.assignedTasks > 0);

  return {
    project,
    projectCode: `${projectKey(project.name)}-${String(project.projectId).padStart(4, "0")}`,
    projectManager,
    startedOn,
    closedOn,
    plannedDeadline,
    scheduleVerdict,
    daysOverdue,
    daysEarly,

    totalTasks: tasks.length,
    doneTasks,
    unfinishedTasks: tasks.length - doneTasks,
    onTimeTasks: withDeadline.length - lateTasks,
    lateTasks,
    overdueUnfinishedTasks: tasks.filter((t) => t.status !== "Done" && isLate(t)).length,
    tasksWithoutDeadline: tasks.length - withDeadline.length,
    completionRate: tasks.length === 0 ? 0 : round1((doneTasks / tasks.length) * 100),
    onTimeRate: tasks.length === 0 ? 0 : round1(((withDeadline.length - lateTasks) / tasks.length) * 100),
    lateRate: tasks.length === 0 ? 0 : round1((lateTasks / tasks.length) * 100),

    members: memberRows,
    roleCount: new Set(memberRows.filter((m) => m.userId !== UNASSIGNED_ID).map((m) => m.role)).size,
    bestPerformer:
      [...rated].sort((a, b) => b.onTimeRate - a.onTimeRate || b.assignedTasks - a.assignedTasks)[0] ?? null,
    mostLate: rated.some((m) => m.lateTasks > 0)
      ? [...rated].sort((a, b) => b.lateTasks - a.lateTasks)[0]
      : null,
    highestWorkload: [...rated].sort((a, b) => b.assignedTasks - a.assignedTasks)[0] ?? null,

    lateTaskRows,
    averageDaysLate: lateTaskRows.length === 0 ? 0 : round1(totalLateDays / lateTaskRows.length),
    longestDelay: lateTaskRows.reduce((max, row) => Math.max(max, row.daysLate), 0),

    gantt: buildGantt(tasks),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (date: Date | null): string =>
  date
    ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
    : "—";

/** Escapes text before it goes into the report markup — a task title is user input. */
const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

const COLORS = {
  navy: "#1F3A5F",
  green: "#2E8B57",
  red: "#C0392B",
  amber: "#B7791F",
  blue: "#2C6DA3",
};

/** Bar colour per task status on the Gantt — same mapping the board's columns use. */
const GANTT_STATUS_COLOR: Record<string, string> = {
  Done: COLORS.green,
  InProgress: COLORS.blue,
  InReview: COLORS.amber,
  Todo: "#94A3B8",
};

const STATUS_LABEL: Record<string, string> = {
  Done: "Hoàn thành",
  InProgress: "Đang làm",
  InReview: "Chờ duyệt",
  Todo: "Cần làm",
};

/** dd/MM, for the timeline axis where the year is already implied by the header. */
const formatDayMonth = (date: Date): string =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/**
 * Donut drawn as inline SVG arcs.
 *
 * No chart library: the report renders in a detached print window, and pulling a charting bundle
 * into it for two figures would add a runtime dependency to the whole app.
 */
function donutSvg(slices: { label: string; value: number; color: string }[]): string {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return `<p class="empty">Không có công việc để vẽ biểu đồ.</p>`;

  const cx = 110;
  const cy = 110;
  const outer = 88;
  const inner = 52;
  let angle = -Math.PI / 2;

  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const sweep = (slice.value / total) * Math.PI * 2;
      const end = angle + sweep;
      const large = sweep > Math.PI ? 1 : 0;

      // A single slice cannot be drawn as an arc (start and end coincide) — draw two rings instead.
      if (slice.value === total) {
        angle = end;
        return `<circle cx="${cx}" cy="${cy}" r="${(outer + inner) / 2}" fill="none"
          stroke="${slice.color}" stroke-width="${outer - inner}" />`;
      }

      const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
      const d = [
        `M ${p(outer, angle)}`,
        `A ${outer} ${outer} 0 ${large} 1 ${p(outer, end)}`,
        `L ${p(inner, end)}`,
        `A ${inner} ${inner} 0 ${large} 0 ${p(inner, angle)}`,
        "Z",
      ].join(" ");

      const mid = angle + sweep / 2;
      const labelR = (outer + inner) / 2;
      const pct = Math.round((slice.value / total) * 100);
      const label =
        pct >= 8
          ? `<text x="${(cx + labelR * Math.cos(mid)).toFixed(1)}" y="${(cy + labelR * Math.sin(mid)).toFixed(1)}"
              text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="11" font-weight="700">${pct}%</text>`
          : "";

      angle = end;
      return `<path d="${d}" fill="${slice.color}" />${label}`;
    })
    .join("");

  return `
    <svg viewBox="0 0 220 220" width="200" height="200" role="img" aria-label="Tỷ lệ đúng hạn và trễ hạn">
      ${paths}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="26" font-weight="700" fill="#111827">${total}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#6b7280">task</text>
    </svg>`;
}

/** Stacked bars: on-time below, late above, total labelled on top. */
function barChartSvg(members: MemberReportRow[]): string {
  const rows = members.slice(0, 8);
  if (rows.length === 0) return `<p class="empty">Chưa có phân công để vẽ biểu đồ.</p>`;

  const max = Math.max(...rows.map((m) => m.assignedTasks), 1);
  const width = 620;
  const height = 250;
  const padLeft = 42;
  const padBottom = 42;
  const padTop = 22;
  const plotH = height - padBottom - padTop;
  const slot = (width - padLeft - 12) / rows.length;
  const barW = Math.min(56, slot * 0.55);

  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((max / 4) * i));
  const gridlines = ticks
    .map((tick) => {
      const y = padTop + plotH - (tick / max) * plotH;
      return `<line x1="${padLeft}" y1="${y}" x2="${width - 8}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />
        <text x="${padLeft - 8}" y="${y + 3}" text-anchor="end" font-size="9" fill="#6b7280">${tick}</text>`;
    })
    .join("");

  const bars = rows
    .map((m, i) => {
      const x = padLeft + slot * i + (slot - barW) / 2;
      const onTimeH = (m.onTimeTasks / max) * plotH;
      const lateH = (m.lateTasks / max) * plotH;
      const baseY = padTop + plotH;
      // Family name last is how these names are read aloud; the full name is in the table below.
      const short = m.userName.trim().split(/\s+/).slice(-1)[0];
      return `
        <rect x="${x}" y="${baseY - onTimeH}" width="${barW}" height="${onTimeH}" fill="${COLORS.green}" />
        <rect x="${x}" y="${baseY - onTimeH - lateH}" width="${barW}" height="${lateH}" fill="${COLORS.red}" />
        <text x="${x + barW / 2}" y="${baseY - onTimeH - lateH - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="#111827">${m.assignedTasks}</text>
        <text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" font-size="10" fill="#374151">${escapeHtml(short)}</text>`;
    })
    .join("");

  return `
    <div class="legend">
      <span><i style="background:${COLORS.green}"></i> Đúng hạn</span>
      <span><i style="background:${COLORS.red}"></i> Trễ hạn</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Số task theo thành viên">
      ${gridlines}
      <line x1="${padLeft}" y1="${padTop + plotH}" x2="${width - 8}" y2="${padTop + plotH}" stroke="#9ca3af" />
      <text transform="translate(12 ${padTop + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="10" fill="#6b7280">Số task</text>
      ${bars}
    </svg>`;
}

const ganttToday = (): Date => dateOnly(new Date());

/** Colour/legend swatch, shared by every Gantt page. */
function ganttLegend(gantt: GanttData): string {
  const todayInRange = ganttToday() >= gantt.rangeStart && ganttToday() <= gantt.rangeEnd;
  return `
    <div class="legend">
      <span><i style="background:${GANTT_STATUS_COLOR.Done}"></i> Hoàn thành</span>
      <span><i style="background:${GANTT_STATUS_COLOR.InProgress}"></i> Đang làm</span>
      <span><i style="background:${GANTT_STATUS_COLOR.InReview}"></i> Chờ duyệt</span>
      <span><i style="background:${GANTT_STATUS_COLOR.Todo}"></i> Cần làm</span>
      ${gantt.estimatedCount > 0 ? `<span><i style="border:1px dashed #6b7280;background:#f3f4f6"></i> Ước tính</span>` : ""}
      ${todayInRange ? `<span><i style="background:${COLORS.red}"></i> Hôm nay</span>` : ""}
    </div>`;
}

function ganttNotes(gantt: GanttData): string {
  const notes: string[] = [];
  if (gantt.estimatedCount > 0) {
    notes.push(
      `* ${gantt.estimatedCount} công việc thiếu ngày bắt đầu hoặc hạn chót — mốc thời gian được suy ra từ ngày tạo / ngày hoàn thành và vẽ bằng nét đứt.`
    );
  }
  if (gantt.undatedCount > 0) {
    notes.push(`${gantt.undatedCount} công việc không có bất kỳ ngày nào nên không thể đưa lên sơ đồ.`);
  }
  return notes.map((n) => `<p class="empty">${n}</p>`).join("");
}

/**
 * One page of the project timeline as inline SVG — a bar per task, positioned StartDate → Deadline
 * (inferred dates drawn dashed) and filled to Progress, over a weekly grid with a "today" marker.
 *
 * Same no-library approach as the donut and bar chart above: the report prints from a detached
 * window, so the chart is hand-drawn. `pageRows` is the slice to draw; the scale and axis come
 * from the whole `gantt` so every page lines up.
 */
function ganttSvg(gantt: GanttData, pageRows: GanttTaskRow[]): string {
  const { rangeStart, rangeEnd, weekTicks } = gantt;

  const vbWidth = 720;
  const labelW = 150;
  const timelineMax = vbWidth - labelW;
  const totalDays = Math.max(dayDiff(rangeEnd, rangeStart) + 1, 1);
  const pxPerDay = Math.min(timelineMax / totalDays, 26);

  const headerH = 20;
  const rowH = 18;
  const bodyH = Math.max(pageRows.length, 1) * rowH;
  const vbHeight = headerH + bodyH + 6;

  const xFor = (d: Date) => labelW + dayDiff(d, rangeStart) * pxPerDay;

  const today = ganttToday();
  const todayInRange = today >= rangeStart && today <= rangeEnd;

  const grid = weekTicks
    .map((tick) => {
      const x = xFor(tick);
      // Skip the label (not the gridline) when it would run off the right edge.
      const label =
        x + 28 <= vbWidth
          ? `<text x="${(x + 2).toFixed(1)}" y="12" font-size="8" fill="#6b7280">${formatDayMonth(tick)}</text>`
          : "";
      return `<line x1="${x.toFixed(1)}" y1="${headerH}" x2="${x.toFixed(1)}" y2="${headerH + bodyH}" stroke="#e5e7eb" stroke-width="0.5" />${label}`;
    })
    .join("");

  const bars = pageRows
    .map((row, i) => {
      const y = headerH + i * rowH;
      const x = xFor(row.start);
      const w = Math.max((dayDiff(row.end, row.start) + 1) * pxPerDay, 3);
      const color = GANTT_STATUS_COLOR[row.status] ?? GANTT_STATUS_COLOR.Todo;
      const barY = y + 4;
      const barH = rowH - 8;
      const title = `${escapeHtml(truncate(row.title, 32))}${row.estimated ? " *" : ""}`;
      const track = row.estimated
        ? `<rect x="${x.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" rx="2" fill="${color}" opacity="0.12" stroke="${color}" stroke-width="0.8" stroke-dasharray="3,2" />`
        : `<rect x="${x.toFixed(1)}" y="${barY}" width="${w.toFixed(1)}" height="${barH}" rx="2" fill="${color}" opacity="0.22" />`;
      const fill =
        row.progress > 0
          ? `<rect x="${x.toFixed(1)}" y="${barY}" width="${((w * row.progress) / 100).toFixed(1)}" height="${barH}" rx="2" fill="${color}" opacity="${row.estimated ? "0.5" : "1"}" />`
          : "";
      return `
        <text x="0" y="${(y + rowH / 2 + 3).toFixed(1)}" font-size="8.5" fill="#374151">${title}</text>
        ${track}
        ${fill}`;
    })
    .join("");

  const todayLine = todayInRange
    ? `<line x1="${xFor(today).toFixed(1)}" y1="${headerH}" x2="${xFor(today).toFixed(1)}" y2="${headerH + bodyH}" stroke="${COLORS.red}" stroke-width="1" stroke-dasharray="2,2" />`
    : "";

  return `
    <svg viewBox="0 0 ${vbWidth} ${vbHeight}" width="100%" role="img" aria-label="Sơ đồ Gantt tiến độ dự án">
      <line x1="${labelW}" y1="${headerH}" x2="${labelW}" y2="${headerH + bodyH}" stroke="#9ca3af" stroke-width="0.5" />
      ${grid}
      ${bars}
      ${todayLine}
    </svg>`;
}

function ganttTable(gantt: GanttData): string {
  const rows = gantt.rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.title)}${row.estimated ? ' <span style="color:#6b7280">*</span>' : ""}</td>
        <td>${formatDate(row.start)}</td>
        <td>${formatDate(row.end)}</td>
        <td class="num">${dayDiff(row.end, row.start) + 1}</td>
        <td>${STATUS_LABEL[row.status] ?? escapeHtml(row.status)}</td>
        <td class="num">${row.progress}%</td>
      </tr>`
    )
    .join("");

  return `
    <table class="grid-t" style="margin-top:14px">
      <thead>
        <tr><th>Công việc</th><th>Bắt đầu</th><th>Kết thúc</th><th class="num">Số ngày</th><th>Trạng thái</th><th class="num">Tiến độ</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * The Gantt page body (without the outer page frame): section heading, legend, the full timeline
 * with a bar for every dated task, and the schedule table. A long project simply flows the chart
 * onto a second printed sheet.
 */
function ganttSection(report: ProjectReport): string {
  const heading = `
    <div class="section">
      <div class="no">04</div>
      <div class="t"><h2>Sơ đồ Gantt tiến độ dự án</h2><p>Dòng thời gian của từng công việc: bắt đầu → hạn chót, tô theo tiến độ</p></div>
    </div>`;

  const gantt = report.gantt;
  if (!gantt) {
    return `${heading}
      <p class="empty">Dự án không có công việc nào mang ngày để dựng sơ đồ Gantt.</p>`;
  }

  return `${heading}
    ${ganttLegend(gantt)}
    ${ganttSvg(gantt, gantt.rows)}
    ${ganttTable(gantt)}
    ${ganttNotes(gantt)}`;
}

function verdictCopy(report: ProjectReport): { headline: string; badgeTitle: string; badgeValue: string; tone: string } {
  switch (report.scheduleVerdict) {
    case "LATE":
      return {
        headline: "Dự án không đóng trước hoặc đúng planning.",
        badgeTitle: "QUÁ HẠN",
        badgeValue: `${report.daysOverdue} NGÀY`,
        tone: "late",
      };
    case "EARLY":
      return {
        headline: "Dự án đóng trước planning.",
        badgeTitle: "ĐÓNG SỚM",
        badgeValue: `${report.daysEarly} NGÀY`,
        tone: "early",
      };
    case "ON_TIME":
      return {
        headline: "Dự án đóng đúng planning.",
        badgeTitle: "ĐÚNG HẠN",
        badgeValue: "0 NGÀY",
        tone: "ontime",
      };
    default:
      return {
        headline: "Dự án không đặt hạn chót khi tạo, không thể đối chiếu planning.",
        badgeTitle: "KHÔNG CÓ",
        badgeValue: "PLANNING",
        tone: "none",
      };
  }
}

/** A remark assembled from the figures, so it can never contradict the tables above it. */
function remark(report: ProjectReport): string {
  if (report.totalTasks === 0) return "Dự án không có công việc nào được ghi nhận.";

  const parts: string[] = [];
  parts.push(
    report.completionRate === 100
      ? "Dự án hoàn tất đầy đủ phạm vi công việc."
      : `Dự án đóng khi còn ${report.unfinishedTasks} task chưa hoàn thành (${100 - report.completionRate}% phạm vi).`
  );
  if (report.lateTasks === 0) {
    parts.push("Không có task nào trễ hạn.");
  } else {
    parts.push(`Có ${report.lateTasks} task trễ hạn, trung bình ${report.averageDaysLate} ngày/task.`);
    if (report.mostLate) {
      parts.push(`Tập trung nhiều nhất ở ${report.mostLate.userName} với ${report.mostLate.lateTasks} task trễ.`);
    }
  }
  if (report.scheduleVerdict === "LATE") {
    parts.push(`Việc đóng dự án chậm ${report.daysOverdue} ngày so với kế hoạch.`);
  }
  return parts.join(" ");
}

export function renderReportHtml(report: ProjectReport): string {
  const { project } = report;
  const v = verdictCopy(report);

  const statusLabel =
    report.scheduleVerdict === "NO_PLAN"
      ? "Đã đóng - Không có planning"
      : report.scheduleVerdict === "LATE"
        ? "Đã đóng - Trễ kế hoạch"
        : report.scheduleVerdict === "EARLY"
          ? "Đã đóng - Sớm kế hoạch"
          : "Đã đóng - Đúng kế hoạch";

  const donut = donutSvg([
    { label: "Đúng hạn", value: report.onTimeTasks, color: COLORS.green },
    { label: "Trễ hạn", value: report.lateTasks, color: COLORS.red },
    { label: "Không đặt hạn", value: report.tasksWithoutDeadline, color: "#94A3B8" },
  ]);

  const memberRows =
    report.members
      .map(
        (m) => `
        <tr>
          <td>${escapeHtml(m.userName)}</td>
          <td>${escapeHtml(m.role)}</td>
          <td class="num">${m.assignedTasks}</td>
          <td class="num">${m.onTimeTasks}</td>
          <td class="num ${m.lateTasks > 0 ? "bad" : "good"}">${m.lateTasks}</td>
          <td class="num">${m.onTimeRate.toFixed(1)}%</td>
          <td class="num">${m.averageDaysLate.toFixed(1)}</td>
        </tr>`
      )
      .join("") || `<tr><td colspan="7" class="empty">Dự án không có công việc nào.</td></tr>`;

  const lateRows =
    report.lateTaskRows
      .map(
        (row) => `
        <tr>
          <td>${escapeHtml(row.code)}</td>
          <td>${escapeHtml(row.title)}</td>
          <td>${escapeHtml(row.owners)}</td>
          <td>${formatDate(row.deadline)}</td>
          <td>${row.completedAt ? formatDate(row.completedAt) : "Chưa hoàn thành"}</td>
          <td class="num bad">${row.daysLate}</td>
        </tr>`
      )
      .join("") || `<tr><td colspan="6" class="empty">Không có task nào trễ hạn.</td></tr>`;

  const highlight = (title: string, name: string | null, detail: string, tone: string) => `
    <div class="highlight ${tone}">
      <div class="k">${title}</div>
      <div class="v">${name ? escapeHtml(name) : "—"}</div>
      <div class="d">${detail}</div>
    </div>`;

  const runningHeader = `
    <div class="running">
      <span>PROJECT PERFORMANCE REPORT</span>
      <span>${escapeHtml(report.projectCode)}</span>
    </div>`;

  return `
<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Báo cáo tiến độ dự án — ${escapeHtml(project.name)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; margin: 0; font-size: 11px; line-height: 1.45; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .running { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; letter-spacing: .06em;
    color: ${COLORS.navy}; border-bottom: 2px solid ${COLORS.navy}; padding-bottom: 6px; margin-bottom: 18px; }
  h1 { font-size: 27px; margin: 0 0 4px; letter-spacing: -.01em; }
  .project-name { font-size: 17px; font-weight: 700; color: ${COLORS.blue}; margin: 0 0 14px; }

  table { width: 100%; border-collapse: collapse; }
  .meta td { border: 1px solid #e5e7eb; padding: 8px 10px; }
  .meta td.k { background: #f8fafc; font-weight: 600; width: 17%; color: #374151; }

  .verdict { display: flex; margin: 16px 0; }
  .verdict .body { flex: 1; background: ${COLORS.navy}; color: #fff; padding: 12px 14px; }
  .verdict .body .k { font-size: 9px; letter-spacing: .1em; opacity: .8; }
  .verdict .body .h { font-size: 15px; font-weight: 700; margin: 5px 0 6px; }
  .verdict .body .d { font-size: 9.5px; opacity: .85; }
  .verdict .badge { width: 190px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #fff; background: ${COLORS.red}; padding: 10px; text-align: center; }
  .verdict .badge.early, .verdict .badge.ontime { background: ${COLORS.green}; }
  .verdict .badge.none { background: #6b7280; }
  .verdict .badge .k { font-size: 9px; letter-spacing: .1em; opacity: .9; }
  .verdict .badge .v { font-size: 25px; font-weight: 800; line-height: 1.1; }

  .stats { display: flex; gap: 0; margin-bottom: 20px; }
  .stat { flex: 1; padding: 10px 12px; }
  .stat:nth-child(1) { background: #eef2f7; }
  .stat:nth-child(2) { background: #ecf7f0; }
  .stat:nth-child(3) { background: #fdeeec; }
  .stat .k { font-size: 8.5px; letter-spacing: .08em; color: #6b7280; font-weight: 700; }
  .stat .v { font-size: 27px; font-weight: 800; line-height: 1.15; }
  .stat .d { font-size: 9px; color: #6b7280; }
  .stat:nth-child(4) { background: #fdf5e9; }
  .stat:nth-child(2) .v { color: ${COLORS.green}; }
  .stat:nth-child(3) .v { color: ${COLORS.red}; }
  .stat:nth-child(4) .v { color: ${COLORS.amber}; }
  .stat:nth-child(1) .v { color: ${COLORS.navy}; }

  .section { display: flex; align-items: stretch; gap: 10px; margin: 20px 0 12px; }
  .section .no { background: ${COLORS.navy}; color: #fff; font-weight: 800; font-size: 12px;
    padding: 6px 9px; display: flex; align-items: center; }
  .section .t h2 { font-size: 15px; margin: 0; }
  .section .t p { font-size: 9.5px; color: #6b7280; margin: 2px 0 0; }

  .split { display: flex; gap: 14px; border: 1px solid #e5e7eb; padding: 12px; align-items: center; }
  .split .chart { width: 235px; text-align: center; }
  .split .facts { flex: 1; }
  .split .facts h3 { font-size: 12.5px; margin: 0 0 8px; color: ${COLORS.blue}; }
  .split .facts p { margin: 0 0 5px; }

  .legend { display: flex; gap: 16px; justify-content: center; font-size: 10px; margin-bottom: 4px; }
  .legend i { display: inline-block; width: 10px; height: 10px; margin-right: 4px; vertical-align: -1px; }

  .grid-t th, .grid-t td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
  .grid-t th { background: ${COLORS.navy}; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
  .grid-t.danger th { background: ${COLORS.red}; }
  .grid-t tbody tr:nth-child(even) { background: #fafbfc; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.bad { color: ${COLORS.red}; font-weight: 700; background: #fdf1f0; }
  td.good { color: ${COLORS.green}; font-weight: 700; background: #f0f8f3; }
  td.empty, p.empty { text-align: center; color: #6b7280; padding: 16px; }

  .cards { display: flex; gap: 0; margin-top: 14px; }
  .highlight { flex: 1; padding: 10px 12px; }
  .highlight.good { background: #f0f8f3; }
  .highlight.bad { background: #fdf1f0; }
  .highlight.neutral { background: #eef2f7; }
  .highlight .k { font-size: 8.5px; letter-spacing: .08em; color: #6b7280; font-weight: 700; }
  .highlight .v { font-size: 14px; font-weight: 700; margin: 3px 0; }
  .highlight.good .v { color: ${COLORS.green}; }
  .highlight.bad .v { color: ${COLORS.red}; }
  .highlight.neutral .v { color: ${COLORS.navy}; }
  .highlight .d { font-size: 9.5px; color: #6b7280; }

  .cells { display: flex; flex-wrap: wrap; margin-top: 14px; }
  .cell { width: 33.33%; padding: 10px 12px; border: 1px solid #e5e7eb; margin: -1px 0 0 -1px; }
  .cell .k { font-size: 8.5px; letter-spacing: .08em; color: #6b7280; font-weight: 700; }
  .cell .v { font-size: 14px; font-weight: 700; color: ${COLORS.red}; }
  .cell.neutral .v { color: ${COLORS.navy}; }

  .formula { background: #eaf2f8; border: 1px solid #cfe0ee; padding: 12px; text-align: center; margin: 8px 0 16px; }
  .formula .f { font-weight: 700; font-size: 12px; color: ${COLORS.navy}; }
  .formula .c { margin-top: 6px; color: ${COLORS.red}; font-weight: 700; }

  .rules { display: flex; gap: 0; }
  .rule { flex: 1; padding: 12px; text-align: center; }
  .rule:nth-child(1) { background: #f0f8f3; }
  .rule:nth-child(2) { background: #eef2f7; }
  .rule:nth-child(3) { background: #fdf1f0; }
  .rule .k { font-weight: 800; font-size: 11px; letter-spacing: .04em; }
  .rule:nth-child(1) .k { color: ${COLORS.green}; }
  .rule:nth-child(3) .k { color: ${COLORS.red}; }
  .rule .f { font-size: 9.5px; font-weight: 700; margin: 6px 0 4px; }
  .rule .d { font-size: 9px; color: #6b7280; }

  ol { margin: 6px 0 0; padding-left: 18px; }
  ol li { margin-bottom: 4px; }

  .signature { display: flex; margin-top: 34px; text-align: center; }
  .signature div { flex: 1; }
  .signature .k { font-size: 8.5px; letter-spacing: .08em; color: #6b7280; font-weight: 700; margin-bottom: 22px; }
  .signature .v { font-weight: 700; border-top: 1px solid #9ca3af; display: inline-block; padding-top: 5px; min-width: 130px; }

  footer { margin-top: 20px; padding-top: 7px; border-top: 1px solid #e5e7eb;
    display: flex; justify-content: space-between; color: #9ca3af; font-size: 9px; font-style: italic; }
</style>
</head>
<body>

<!-- ── Trang 1 ─────────────────────────────────────────────────────────── -->
<section class="page">
  ${runningHeader}
  <h1>BÁO CÁO TIẾN ĐỘ DỰ ÁN</h1>
  <p class="project-name">${escapeHtml(project.name)}</p>

  <table class="meta">
    <tr>
      <td class="k">Mã dự án</td><td>${escapeHtml(report.projectCode)}</td>
      <td class="k">Quản lý dự án</td><td>${escapeHtml(report.projectManager)}</td>
    </tr>
    <tr>
      <td class="k">Thời gian</td><td>${formatDate(report.startedOn)} - ${formatDate(report.closedOn)}</td>
      <td class="k">Trạng thái</td><td style="color:${report.scheduleVerdict === "LATE" ? COLORS.red : COLORS.green}">${statusLabel}</td>
    </tr>
  </table>

  <div class="verdict">
    <div class="body">
      <div class="k">KẾT LUẬN TIẾN ĐỘ</div>
      <div class="h">${v.headline}</div>
      <div class="d">Ngày đóng kế hoạch: ${formatDate(report.plannedDeadline)} | Ngày đóng thực tế: ${formatDate(report.closedOn)}</div>
    </div>
    <div class="badge ${v.tone}">
      <div class="k">${v.badgeTitle}</div>
      <div class="v">${v.badgeValue}</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="k">TỔNG SỐ TASK</div><div class="v">${report.totalTasks}</div>
      <div class="d">${report.completionRate}% đã hoàn thành</div>
    </div>
    <div class="stat">
      <div class="k">TASK ĐÚNG HẠN</div><div class="v">${report.onTimeTasks}</div>
      <div class="d">${report.onTimeRate}% tổng task</div>
    </div>
    <div class="stat">
      <div class="k">TASK TRỄ HẠN</div><div class="v">${report.lateTasks}</div>
      <div class="d">${report.lateRate}% tổng task</div>
    </div>
    <div class="stat">
      <div class="k">THÀNH VIÊN</div><div class="v">${report.members.filter((m) => m.userId !== -1).length}</div>
      <div class="d">${report.roleCount} vai trò</div>
    </div>
  </div>

  <div class="section">
    <div class="no">01</div>
    <div class="t"><h2>Tổng quan tiến độ</h2><p>Tỷ lệ hoàn thành task và đánh giá thời điểm đóng dự án</p></div>
  </div>

  <div class="split">
    <div class="chart">${donut}</div>
    <div class="facts">
      <h3>Đánh giá chính</h3>
      <p>Tỷ lệ đúng hạn: <strong style="color:${COLORS.green}">${report.onTimeRate}%</strong></p>
      <p>Tỷ lệ trễ hạn: <strong style="color:${COLORS.red}">${report.lateRate}%</strong></p>
      <p>Độ trễ đóng dự án: <strong style="color:${report.daysOverdue ? COLORS.red : COLORS.green}">${
        report.scheduleVerdict === "NO_PLAN" ? "Không có planning" : `${report.daysOverdue} ngày`
      }</strong></p>
      <p>Mức độ hoàn tất: <strong>${report.doneTasks}/${report.totalTasks} task</strong></p>
      <p style="margin-top:9px"><strong>Nhận xét:</strong> ${escapeHtml(remark(report))}</p>
    </div>
  </div>

  <footer><span>Xuất từ TaskGenie ngày ${formatDate(new Date())}</span><span>Trang 1</span></footer>
</section>

<!-- ── Trang 2 ─────────────────────────────────────────────────────────── -->
<section class="page">
  ${runningHeader}
  <div class="section">
    <div class="no">02</div>
    <div class="t"><h2>Phân bổ task theo thành viên</h2><p>Số task được giao, số task đúng hạn và số task trễ của từng member</p></div>
  </div>

  ${barChartSvg(report.members)}

  <table class="grid-t" style="margin-top:14px">
    <thead>
      <tr>
        <th>Thành viên</th><th>Vai trò</th><th class="num">Được giao</th><th class="num">Đúng hạn</th>
        <th class="num">Trễ hạn</th><th class="num">Tỷ lệ đúng hạn</th><th class="num">Trễ TB (ngày)</th>
      </tr>
    </thead>
    <tbody>${memberRows}</tbody>
  </table>

  <div class="cards">
    ${highlight(
      "HIỆU SUẤT TỐT NHẤT",
      report.bestPerformer?.userName ?? null,
      report.bestPerformer
        ? `${report.bestPerformer.onTimeTasks}/${report.bestPerformer.assignedTasks} task đúng hạn`
        : "Chưa có dữ liệu",
      "good"
    )}
    ${highlight(
      "NHIỀU TASK TRỄ NHẤT",
      report.mostLate?.userName ?? null,
      report.mostLate ? `${report.mostLate.lateTasks} task trễ hạn` : "Không có task trễ",
      "bad"
    )}
    ${highlight(
      "KHỐI LƯỢNG CAO NHẤT",
      report.highestWorkload?.userName ?? null,
      report.highestWorkload ? `${report.highestWorkload.assignedTasks} task được giao` : "Chưa có dữ liệu",
      "neutral"
    )}
  </div>

  <footer><span>Xuất từ TaskGenie ngày ${formatDate(new Date())}</span><span>Trang 2</span></footer>
</section>

<!-- ── Trang 3 ─────────────────────────────────────────────────────────── -->
<section class="page">
  ${runningHeader}
  <div class="section">
    <div class="no">03</div>
    <div class="t"><h2>Chi tiết các task bị trễ</h2><p>Danh sách task quá hạn và số ngày trễ</p></div>
  </div>

  <table class="grid-t danger">
    <thead>
      <tr><th>Mã task</th><th>Tên task</th><th>Phụ trách</th><th>Deadline</th><th>Hoàn thành</th><th class="num">Trễ (ngày)</th></tr>
    </thead>
    <tbody>${lateRows}</tbody>
  </table>

  <div class="cells">
    <div class="cell"><div class="k">TỔNG TASK TRỄ</div><div class="v">${report.lateTasks} task</div></div>
    <div class="cell"><div class="k">TRỄ TRUNG BÌNH</div><div class="v">${report.averageDaysLate} ngày/task</div></div>
    <div class="cell"><div class="k">TRỄ DÀI NHẤT</div><div class="v">${report.longestDelay} ngày</div></div>
    <div class="cell neutral"><div class="k">THÀNH VIÊN TRỄ NHIỀU NHẤT</div><div class="v">${
      report.mostLate ? escapeHtml(report.mostLate.userName) : "—"
    }</div></div>
    <div class="cell"><div class="k">CHƯA XONG & QUÁ HẠN</div><div class="v">${report.overdueUnfinishedTasks} task</div></div>
    <div class="cell"><div class="k">ẢNH HƯỞNG ĐÓNG DỰ ÁN</div><div class="v">${
      report.scheduleVerdict === "LATE" ? `+${report.daysOverdue} ngày` : "Không trễ"
    }</div></div>
  </div>

  <footer><span>Xuất từ TaskGenie ngày ${formatDate(new Date())}</span><span>Trang 3</span></footer>
</section>

<!-- ── Trang 4 · Sơ đồ Gantt ───────────────────────────────────────────── -->
<section class="page">
  ${runningHeader}
  ${ganttSection(report)}
  <footer><span>Xuất từ TaskGenie ngày ${formatDate(new Date())}</span><span>Trang 4</span></footer>
</section>

<!-- ── Trang 5 ─────────────────────────────────────────────────────────── -->
<section class="page">
  ${runningHeader}
  <div class="section">
    <div class="no">05</div>
    <div class="t"><h2>Đánh giá đóng dự án so với planning</h2><p>Xác định dự án đóng sớm, đúng hạn hay quá hạn</p></div>
  </div>

  <table class="meta">
    <tr><td class="k" style="width:32%">Ngày đóng theo planning</td><td>${formatDate(report.plannedDeadline)}</td></tr>
    <tr><td class="k">Ngày đóng thực tế</td><td>${formatDate(report.closedOn)}</td></tr>
    <tr><td class="k">Kết quả</td><td style="color:${
      report.scheduleVerdict === "LATE" ? COLORS.red : COLORS.green
    };font-weight:700">${v.headline.replace(/^Dự án /, "").replace(/\.$/, "")}</td></tr>
    <tr><td class="k">Số ngày quá hạn</td><td style="color:${
      report.daysOverdue ? COLORS.red : COLORS.green
    };font-weight:700">${report.scheduleVerdict === "NO_PLAN" ? "—" : `${report.daysOverdue} ngày`}</td></tr>
  </table>

  <h3 style="font-size:12px;margin:16px 0 4px">Công thức xác định:</h3>
  <div class="formula">
    <div class="f">Số ngày quá hạn = Ngày đóng thực tế − Ngày đóng theo planning</div>
    <div class="c">${
      report.plannedDeadline
        ? `${formatDate(report.closedOn)} − ${formatDate(report.plannedDeadline)} = ${
            report.scheduleVerdict === "LATE" ? report.daysOverdue : 0
          } ngày`
        : "Dự án không đặt hạn chót khi tạo"
    }</div>
  </div>

  <h3 style="font-size:12px;margin:0 0 6px">Quy tắc hiển thị trạng thái:</h3>
  <div class="rules">
    <div class="rule"><div class="k">ĐÓNG SỚM</div><div class="f">Actual End &lt; Planned End</div><div class="d">Dự án đóng trước kế hoạch</div></div>
    <div class="rule"><div class="k">ĐÚNG HẠN</div><div class="f">Actual End = Planned End</div><div class="d">Dự án đóng đúng planning</div></div>
    <div class="rule"><div class="k">QUÁ HẠN</div><div class="f">Actual End &gt; Planned End</div><div class="d">Hiển thị số ngày trễ</div></div>
  </div>

  <h3 style="font-size:12px;margin:18px 0 0">Đề xuất cải thiện cho kỳ tiếp theo</h3>
  <ol>
    <li>Thiết lập cảnh báo task có nguy cơ trễ trước deadline 2-3 ngày.</li>
    <li>Giới hạn workload đồng thời cho mỗi member và ưu tiên task nằm trên critical path.</li>
    <li>Tách riêng thời gian tích hợp, kiểm thử và buffer tối thiểu 10% tổng thời lượng dự án.</li>
    <li>Theo dõi tỷ lệ đúng hạn theo tuần để xử lý sớm nhóm hoặc thành viên có xu hướng trễ.</li>
  </ol>

  <div class="signature">
    <div><div class="k">NGƯỜI LẬP BÁO CÁO</div><div class="v">&nbsp;</div></div>
    <div><div class="k">QUẢN LÝ DỰ ÁN</div><div class="v">${escapeHtml(report.projectManager)}</div></div>
    <div><div class="k">NGÀY XUẤT BÁO CÁO</div><div class="v">${formatDate(new Date())}</div></div>
  </div>

  <footer><span>Xuất từ TaskGenie ngày ${formatDate(new Date())}</span><span>Trang 5</span></footer>
</section>

</body>
</html>`;
}

/**
 * Opens the report in a print window so the browser's own "Save as PDF" produces the file.
 *
 * Deliberately no PDF library: rendering the document ourselves would add a runtime dependency
 * (and its fonts) to the bundle for one screen. Returns false when the popup was blocked, so the
 * caller can say so rather than appearing to do nothing.
 */
export function exportProjectReport(
  project: ProjectDto,
  tasks: TaskDetailDto[],
  teamMembers: TeamMemberDto[] = []
): boolean {
  const report = buildProjectReport(project, tasks, teamMembers);
  const win = window.open("", "_blank", "width=1000,height=1100");
  if (!win) return false;

  win.document.write(renderReportHtml(report));
  win.document.close();
  win.focus();
  // Give the new document a tick to lay out before the print dialog measures it.
  win.setTimeout(() => win.print(), 300);
  return true;
}
