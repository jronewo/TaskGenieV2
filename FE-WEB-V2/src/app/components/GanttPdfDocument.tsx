import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, Svg, Rect, Line, G } from "@react-pdf/renderer";
import { format, differenceInCalendarDays } from "date-fns";
import { TaskDetailDto } from "../services/taskApi";
import { ProjectDto } from "../services/projectApi";
import { STATUS_COLOR } from "./charts/chartTheme";

// Register Roboto font to support Vietnamese characters
const origin = typeof window !== "undefined" ? window.location.origin : "";
Font.register({
  family: "Roboto",
  fonts: [
    { src: `${origin}/fonts/Roboto-Regular.ttf` },
    { src: `${origin}/fonts/Roboto-Bold.ttf`, fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    backgroundColor: "#FFFFFF",
    fontSize: 9,
    color: "#1F2937",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 8,
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: "column",
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 2,
  },
  metaContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  metaBadge: {
    fontSize: 7,
    fontWeight: "bold",
    backgroundColor: "#F1F5F9",
    color: "#475569",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  metaBadgeRisk: {
    fontSize: 7,
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    alignItems: "center",
    height: 24,
  },
  leftColHeader: {
    width: 150,
    paddingLeft: 6,
    fontWeight: "bold",
    color: "#475569",
    fontSize: 8,
  },
  rightColHeader: {
    flex: 1,
    height: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
    height: 24,
  },
  leftCol: {
    width: 150,
    paddingLeft: 6,
    color: "#334155",
    fontSize: 7.5,
    paddingRight: 6,
  },
  rightCol: {
    flex: 1,
    height: "100%",
  },
  unscheduledContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
  },
  unscheduledText: {
    fontSize: 7.5,
    color: "#64748B",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 4,
    fontSize: 7,
    color: "#94A3B8",
  },
});

interface ScheduledTask {
  task: TaskDetailDto;
  start: Date;
  end: Date;
}

interface GanttPdfDocumentProps {
  project: ProjectDto | null;
  scheduledTasks: ScheduledTask[];
  unscheduledCount: number;
  rangeStart: Date;
  rangeEnd: Date;
  weekTicks: Date[];
}

export const GanttPdfDocument = ({
  project,
  scheduledTasks,
  unscheduledCount,
  rangeStart,
  rangeEnd,
  weekTicks,
}: GanttPdfDocumentProps) => {
  const timelineDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
  
  // Total page width is 842pt. Margins are 30pt * 2 = 60pt. Printable width is 782pt.
  // Left column for titles takes 150pt. Available width for timeline is 782 - 150 = 632pt.
  const maxTimelineWidth = 632;
  const rawPxPerDay = maxTimelineWidth / timelineDays;
  // Cap pxPerDay at 25pt to avoid overly wide days in short projects
  const pxPerDay = Math.min(rawPxPerDay, 25);
  const actualTimelineWidth = timelineDays * pxPerDay;

  const dayOffset = (d: Date) => differenceInCalendarDays(d, rangeStart);

  const today = new Date();
  // Standardize today to the start of day for comparison
  today.setHours(0, 0, 0, 0);
  const todayInRange = today >= rangeStart && today <= rangeEnd;
  const todayX = todayInRange ? dayOffset(today) * pxPerDay : 0;

  // Batch tasks for page pagination (15 tasks per page fits nicely on A4 landscape)
  const TASKS_PER_PAGE = 15;
  const taskChunks: ScheduledTask[][] = [];
  for (let i = 0; i < scheduledTasks.length; i += TASKS_PER_PAGE) {
    taskChunks.push(scheduledTasks.slice(i, i + TASKS_PER_PAGE));
  }
  if (taskChunks.length === 0) {
    taskChunks.push([]);
  }

  const getRiskColor = (risk: string) => {
    const r = risk.toUpperCase();
    if (r === "HIGH" || r === "CRITICAL") return { bg: "#FEF2F2", text: "#991B1B" };
    if (r === "MEDIUM") return { bg: "#FFFBEB", text: "#92400E" };
    return { bg: "#F0FDF4", text: "#166534" };
  };

  const riskStyle = project ? getRiskColor(project.riskLevel ?? "LOW") : { bg: "#F1F5F9", text: "#475569" };

  return (
    <Document>
      {taskChunks.map((chunk, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          orientation="landscape"
          style={styles.page}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.projectTitle}>
                Sơ đồ Gantt · {project?.name ?? "Dự án"}
              </Text>
              <Text style={styles.subtitle}>
                Thời gian dự án: {format(rangeStart, "dd/MM/yyyy")} → {format(rangeEnd, "dd/MM/yyyy")} (Tổng cộng {timelineDays} ngày)
              </Text>
            </View>
            <View style={styles.metaContainer}>
              <Text style={styles.metaBadge}>Tiến độ: {project?.progress ?? 0}%</Text>
              <Text
                style={[
                  styles.metaBadgeRisk,
                  { backgroundColor: riskStyle.bg, color: riskStyle.text },
                ]}
              >
                Rủi ro: {(project?.riskLevel ?? "LOW").toUpperCase()}
              </Text>
              <Text style={styles.metaBadge}>
                Xuất ngày: {format(new Date(), "dd/MM/yyyy HH:mm")}
              </Text>
            </View>
          </View>

          {/* Gantt Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.leftColHeader}>Tên công việc</Text>
            <View style={styles.rightColHeader}>
              <Svg width={actualTimelineWidth} height={24}>
                {/* Weekly Grid Lines & Labels */}
                {weekTicks.map((tick) => {
                  const x = dayOffset(tick) * pxPerDay;
                  return (
                    <G key={tick.toISOString()}>
                      <Line x1={x} y1={0} x2={x} y2={24} stroke="#E2E8F0" strokeWidth={0.5} />
                      <Text
                        x={x + 3}
                        y={14}
                        fill="#64748B"
                        style={{ fontSize: 7, fontWeight: "bold" }}
                      >
                        {format(tick, "dd/MM")}
                      </Text>
                    </G>
                  );
                })}
                {/* Today Line */}
                {todayInRange && (
                  <Line
                    x1={todayX}
                    y1={0}
                    x2={todayX}
                    y2={24}
                    stroke="#EF4444"
                    strokeWidth={1}
                    strokeDasharray="2, 2"
                  />
                )}
              </Svg>
            </View>
          </View>

          {/* Gantt Table Body */}
          {chunk.map(({ task, start, end }) => {
            const x = dayOffset(start) * pxPerDay;
            const width = Math.max((differenceInCalendarDays(end, start) + 1) * pxPerDay, 4);
            const color = STATUS_COLOR[task.status ?? "Todo"] ?? "#94A3B8";
            const progress = Math.min(100, Math.max(0, task.progress ?? 0));

            return (
              <View key={task.taskId} style={styles.tableRow}>
                {/* Task Title */}
                <Text style={styles.leftCol} numberOfLines={1}>
                  {task.title ?? `Task #${task.taskId}`}
                </Text>
                {/* Task Timeline Bar */}
                <View style={styles.rightCol}>
                  <Svg width={actualTimelineWidth} height={24}>
                    {/* Vertical Grid Lines */}
                    {weekTicks.map((tick) => {
                      const gridX = dayOffset(tick) * pxPerDay;
                      return (
                        <Line
                          key={tick.toISOString()}
                          x1={gridX}
                          y1={0}
                          x2={gridX}
                          y2={24}
                          stroke="#F1F5F9"
                          strokeWidth={0.5}
                        />
                      );
                    })}
                    
                    {/* Today Line */}
                    {todayInRange && (
                      <Line
                        x1={todayX}
                        y1={0}
                        x2={todayX}
                        y2={24}
                        stroke="#EF4444"
                        strokeWidth={0.5}
                        strokeDasharray="2, 2"
                      />
                    )}

                    {/* Gantt Bars */}
                    {/* Background Duration Bar */}
                    <Rect
                      x={x}
                      y={6}
                      width={width}
                      height={12}
                      rx={3}
                      fill={color}
                      opacity={0.18}
                    />
                    {/* Foreground Progress Bar */}
                    <Rect
                      x={x}
                      y={6}
                      width={width * (progress / 100)}
                      height={12}
                      rx={3}
                      fill={color}
                    />
                  </Svg>
                </View>
              </View>
            );
          })}

          {/* Unscheduled Count (Only show on the last page) */}
          {pageIndex === taskChunks.length - 1 && unscheduledCount > 0 && (
            <View style={styles.unscheduledContainer}>
              <Text style={styles.unscheduledText}>
                * Có {unscheduledCount} công việc không được hiển thị do thiếu ngày bắt đầu hoặc ngày hạn chót.
              </Text>
            </View>
          )}

          {/* Footer with Page Number */}
          <View style={styles.footer}>
            <Text>TaskGenie - Quản lý dự án thông minh</Text>
            <Text>
              Trang {pageIndex + 1} / {taskChunks.length}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};
