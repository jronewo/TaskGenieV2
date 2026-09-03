import { render, screen, waitFor } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrashModal } from "../TrashModal";
import { projectApi, ProjectDto } from "../../services/projectApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/projectApi");

const api = vi.mocked(projectApi);

function deletedProject(overrides: Partial<ProjectDto> & { projectId: number; name: string }): ProjectDto {
  return { progress: 0, riskLevel: "LOW", status: "Deleted", ...overrides } as ProjectDto;
}

describe("TrashModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists deleted projects with days remaining before permanent deletion", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    api.listDeleted.mockResolvedValue([
      deletedProject({ projectId: 1, name: "Old website", updatedAt: twoDaysAgo }),
    ]);
    render(<TrashModal onClose={vi.fn()} onRestored={vi.fn()} />);

    expect(await screen.findByText("Old website")).toBeInTheDocument();
    expect(screen.getByText(/permanently deleted in 28 days/i)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is in the trash", async () => {
    api.listDeleted.mockResolvedValue([]);
    render(<TrashModal onClose={vi.fn()} onRestored={vi.fn()} />);

    expect(await screen.findByText(/trash is empty/i)).toBeInTheDocument();
  });

  it("restores a project and removes it from the list, notifying the parent", async () => {
    const user = userEvent.setup();
    const onRestored = vi.fn();
    api.listDeleted.mockResolvedValue([deletedProject({ projectId: 1, name: "Old website" })]);
    api.restore.mockResolvedValue(undefined);
    render(<TrashModal onClose={vi.fn()} onRestored={onRestored} />);

    await screen.findByText("Old website");
    await user.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => expect(api.restore).toHaveBeenCalledWith(1));
    expect(onRestored).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Old website")).not.toBeInTheDocument());
    expect(await screen.findByRole("status")).toHaveTextContent(/restored/i);
  });

  it("shows an error and keeps the project listed when restore fails", async () => {
    const user = userEvent.setup();
    api.listDeleted.mockResolvedValue([deletedProject({ projectId: 1, name: "Old website" })]);
    api.restore.mockRejectedValue(new ApiError(403, "You don't have permission to restore this project."));
    render(<TrashModal onClose={vi.fn()} onRestored={vi.fn()} />);

    await screen.findByText("Old website");
    await user.click(screen.getByRole("button", { name: /restore/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission/i);
    expect(screen.getByText("Old website")).toBeInTheDocument();
  });

  it("closes without restoring anything when Close is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    api.listDeleted.mockResolvedValue([]);
    render(<TrashModal onClose={onClose} onRestored={vi.fn()} />);

    await screen.findByText(/trash is empty/i);
    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
