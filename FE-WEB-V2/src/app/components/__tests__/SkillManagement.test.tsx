import { render, screen, waitFor, within } from "../../../test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SkillManagement } from "../SkillManagement";
import { skillApi } from "../../services/adminApi";
import { ApiError } from "../../services/apiClient";

vi.mock("../../services/adminApi");

const api = vi.mocked(skillApi);

const ADMIN_CATALOG = [
  { skillId: 1, skillName: "React", isActive: true },
  { skillId: 3, skillName: "Legacy COBOL", isActive: false },
];

function mockLoaded() {
  api.adminCatalog.mockResolvedValue(ADMIN_CATALOG);
}

/** Builds a File the component can read with `.text()`, the way a real upload arrives. */
function csvFile(body: string, name = "skills.csv") {
  return new File([body], name, { type: "text/csv" });
}

describe("SkillManagement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the platform catalog, including archived skills", async () => {
    mockLoaded();
    render(<SkillManagement />);

    expect(await screen.findByRole("heading", { name: /platform catalog/i })).toBeInTheDocument();
    expect(screen.getByText("Legacy COBOL")).toBeInTheDocument();
  });

  it("does not offer personal skills — an administrator has no use for them here", async () => {
    mockLoaded();
    render(<SkillManagement />);

    await screen.findByText("React");
    expect(screen.queryByText(/my skills/i)).not.toBeInTheDocument();
    expect(api.mine).not.toHaveBeenCalled();
  });

  it("creates a catalog skill and refetches", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.create.mockResolvedValue({ skillId: 9, skillName: "Rust", isActive: true });
    render(<SkillManagement />);

    await screen.findByText("React");
    await user.type(screen.getByLabelText("New skill name"), "Rust");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith("Rust"));
    expect(api.adminCatalog).toHaveBeenCalledTimes(2); // re-fetched, not optimistically patched
  });

  it("reports a rejected mutation as an alert", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.create.mockRejectedValue(new ApiError(400, "A skill with that name exists."));
    render(<SkillManagement />);

    await screen.findByText("React");
    await user.type(screen.getByLabelText("New skill name"), "React");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A skill with that name exists.");
  });

  it("archives rather than deletes", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.setActive.mockResolvedValue({ skillId: 1, skillName: "React", isActive: false });
    render(<SkillManagement />);

    await screen.findByText("React");
    await user.click(screen.getByRole("button", { name: /archive react/i }));

    await waitFor(() => expect(api.setActive).toHaveBeenCalledWith(1, false));
  });

  it("imports skills from a spreadsheet, one row at a time", async () => {
    const user = userEvent.setup();
    mockLoaded();
    api.create.mockResolvedValue({ skillId: 9, skillName: "Rust", isActive: true });
    render(<SkillManagement />);

    await screen.findByText("React");
    await user.click(screen.getByRole("button", { name: /import excel/i }));
    await user.upload(
      screen.getByLabelText(/chọn tệp/i),
      csvFile("Skill name\r\nRust\r\nKotlin\r\n")
    );

    await screen.findByText("Rust");
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(2));
    expect(api.create).toHaveBeenCalledWith("Rust");
    expect(api.create).toHaveBeenCalledWith("Kotlin");
  });

  it("flags a row already in the catalog instead of sending it", async () => {
    const user = userEvent.setup();
    mockLoaded();
    render(<SkillManagement />);

    await screen.findByText("React");
    await user.click(screen.getByRole("button", { name: /import excel/i }));
    await user.upload(screen.getByLabelText(/chọn tệp/i), csvFile("Skill name\r\nReact\r\n"));

    // The API would reject it anyway; saying which line to fix is the useful part.
    const dialog = await screen.findByRole("dialog", { name: /import skills/i });
    expect(await within(dialog).findByText(/already in the catalog/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^import$/i })).toBeDisabled();
  });
});
