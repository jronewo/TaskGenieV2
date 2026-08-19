import { render, screen, waitFor, within } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskDependencyGraph } from "../TaskDependencyGraph";
import { taskApi } from "../../services/taskApi";

vi.mock("../../services/taskApi");

const api = vi.mocked(taskApi);

/**
 * The real payload for project "ABC", fetched from the running API rather than invented — so the
 * layout is exercised against data the backend actually produces.
 */
const REAL_GRAPH = {
  "hasCycle": false,
  "levelCount": 4,
  "nodes": [
    {
      "id": "3004",
      "title": "db",
      "status": "InReview",
      "priority": "Medium",
      "deadline": "2026-08-04",
      "assigneeName": "trong Huynh",
      "level": 0,
      "blockedByCount": 0,
      "blocksCount": 0,
      "isReady": true,
      "inCycle": false
    },
    {
      "id": "3193",
      "title": "Fix the login redirect",
      "status": "Todo",
      "priority": "Critical",
      "deadline": null,
      "assigneeName": null,
      "level": 1,
      "blockedByCount": 1,
      "blocksCount": 1,
      "isReady": false,
      "inCycle": false
    },
    {
      "id": "3194",
      "title": "Write the rollback runbook",
      "status": "Todo",
      "priority": "Critical",
      "deadline": null,
      "assigneeName": "huỳnh trần văn trọng huỳnh",
      "level": 3,
      "blockedByCount": 2,
      "blocksCount": 0,
      "isReady": false,
      "inCycle": false
    },
    {
      "id": "3239",
      "title": "Tạo database",
      "status": "InProgress",
      "priority": "High",
      "deadline": "2026-08-04",
      "assigneeName": "huỳnh trần văn trọng huỳnh",
      "level": 0,
      "blockedByCount": 0,
      "blocksCount": 2,
      "isReady": true,
      "inCycle": false
    },
    {
      "id": "3240",
      "title": "ABC dựng DB",
      "status": "Todo",
      "priority": "High",
      "deadline": "2026-08-03",
      "assigneeName": "trong Huynh",
      "level": 1,
      "blockedByCount": 1,
      "blocksCount": 1,
      "isReady": false,
      "inCycle": false
    },
    {
      "id": "3241",
      "title": "Dựng DB",
      "status": "Todo",
      "priority": "High",
      "deadline": "2026-08-03",
      "assigneeName": "trong Huynh",
      "level": 2,
      "blockedByCount": 1,
      "blocksCount": 1,
      "isReady": false,
      "inCycle": false
    }
  ],
  "edges": [
    {
      "id": "e_3239_3240",
      "source": "3239",
      "target": "3240",
      "isBlocking": true
    },
    {
      "id": "e_3240_3241",
      "source": "3240",
      "target": "3241",
      "isBlocking": true
    },
    {
      "id": "e_3239_3193",
      "source": "3239",
      "target": "3193",
      "isBlocking": true
    },
    {
      "id": "e_3193_3194",
      "source": "3193",
      "target": "3194",
      "isBlocking": true
    },
    {
      "id": "e_3241_3194",
      "source": "3241",
      "target": "3194",
      "isBlocking": true
    }
  ]
} as any;

describe("TaskDependencyGraph", () => {
  beforeEach(() => vi.clearAllMocks());

  it("draws one node per task and one arrow per dependency", async () => {
    api.dependencyGraph.mockResolvedValue(REAL_GRAPH);
    const { container } = render(
      <TaskDependencyGraph open projectId={3007} projectName="ABC" onClose={vi.fn()} />
    );

    await waitFor(() => expect(api.dependencyGraph).toHaveBeenCalledWith(3007));
    await screen.findByText("Tạo database");

    expect(container.querySelectorAll("svg g rect").length).toBe(REAL_GRAPH.nodes.length);
    expect(container.querySelectorAll("svg path[marker-end]").length).toBe(REAL_GRAPH.edges.length);
  });

  it("reports how many waves the work breaks into and what can start now", async () => {
    api.dependencyGraph.mockResolvedValue(REAL_GRAPH);
    render(<TaskDependencyGraph open projectId={3007} projectName="ABC" onClose={vi.fn()} />);

    // Two tasks have no open prerequisites in this project.
    expect(await screen.findByText(/6 task\(s\) · 4 wave\(s\) · 2 ready to start/)).toBeInTheDocument();
  });

  it("places a task below its latest prerequisite, not its first", async () => {
    api.dependencyGraph.mockResolvedValue(REAL_GRAPH);
    const { container } = render(
      <TaskDependencyGraph open projectId={3007} projectName="ABC" onClose={vi.fn()} />
    );

    await screen.findByText("Tạo database");

    // "Write the rollback runbook" waits on work in two different waves. Naively taking the first
    // prerequisite would put it in wave 2; it genuinely cannot start until wave 3 is finished.
    const runbook = [...container.querySelectorAll("svg g")].find((g) =>
      g.querySelector("title")?.textContent?.includes("Write the rollback runbook")
    );
    expect(runbook).toBeTruthy();
    expect(runbook!.textContent).toContain("wave 4");
  });

  it("names every state in words, so the diagram is not readable by colour alone", async () => {
    api.dependencyGraph.mockResolvedValue(REAL_GRAPH);
    render(<TaskDependencyGraph open projectId={3007} projectName="ABC" onClose={vi.fn()} />);

    await screen.findByText("Tạo database");
    for (const label of ["In a loop", "Done", "Ready to start", "Waiting"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("warns loudly when the stored data still contains a loop", async () => {
    api.dependencyGraph.mockResolvedValue({
      ...REAL_GRAPH,
      hasCycle: true,
      nodes: REAL_GRAPH.nodes.map((n: any) => ({ ...n, inCycle: true })),
    });
    render(<TaskDependencyGraph open projectId={3007} projectName="ABC" onClose={vi.fn()} />);

    // Drawing a partial diagram would hide a project nobody can finish.
    expect(await screen.findByRole("alert")).toHaveTextContent(/circular dependency/i);
  });

  it("opens the task behind a node", async () => {
    const user = userEvent.setup();
    const onOpenTask = vi.fn();
    api.dependencyGraph.mockResolvedValue(REAL_GRAPH);
    render(
      <TaskDependencyGraph open projectId={3007} projectName="ABC" onClose={vi.fn()} onOpenTask={onOpenTask} />
    );

    await user.click(await screen.findByText("Tạo database"));

    expect(onOpenTask).toHaveBeenCalledWith(3239);
  });

  it("says so plainly when a project has no tasks", async () => {
    api.dependencyGraph.mockResolvedValue({ nodes: [], edges: [], hasCycle: false, levelCount: 0 } as any);
    render(<TaskDependencyGraph open projectId={9} onClose={vi.fn()} />);

    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
  });
});
