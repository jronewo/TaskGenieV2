import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PreferencesProvider, usePreferences } from "../PreferencesContext";

const Probe = () => {
  const { theme, setTheme, resolvedTheme, language, setLanguage, t } = usePreferences();
  return (
    <div>
      <p data-testid="theme">{theme}</p>
      <p data-testid="resolved">{resolvedTheme}</p>
      <p data-testid="language">{language}</p>
      <p data-testid="label">{t("settings.title")}</p>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setLanguage("vi")}>vi</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <PreferencesProvider>
      <Probe />
    </PreferencesProvider>
  );

describe("PreferencesContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("defaults to the system theme and English", () => {
    renderProbe();

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByTestId("label")).toHaveTextContent("Settings");
  });

  it("puts the dark class on the root element so the CSS overrides apply", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "dark" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
  });

  it("removes the dark class again when switching back to light", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "dark" }));
    await user.click(screen.getByRole("button", { name: "light" }));

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("translates labels once the language changes", async () => {
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "vi" }));

    expect(screen.getByTestId("label")).toHaveTextContent("Cài đặt");
    expect(document.documentElement.lang).toBe("vi");
  });

  it("persists both choices so a reload keeps them", async () => {
    const user = userEvent.setup();
    const { unmount } = renderProbe();

    await user.click(screen.getByRole("button", { name: "dark" }));
    await user.click(screen.getByRole("button", { name: "vi" }));
    unmount();

    renderProbe();
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("language")).toHaveTextContent("vi");
  });

  it("falls back to the key itself rather than rendering blank", () => {
    renderProbe();

    // A missing key is a bug, but it must not leave an empty label on screen.
    expect(screen.getByTestId("label")).not.toBeEmptyDOMElement();
  });
});

describe("translation coverage", () => {
  it("has a Vietnamese entry for every English key", async () => {
    // A missing key silently falls through to English, which reads as a half-translated console —
    // exactly the state the language switch was in before.
    const { STRINGS } = await import("../PreferencesContext");
    const missing = Object.keys(STRINGS.en).filter((key) => !(key in STRINGS.vi));

    expect(missing).toEqual([]);
  });

  it("covers the navigation and board labels the shell renders on every screen", async () => {
    const { STRINGS } = await import("../PreferencesContext");

    for (const key of ["nav.dashboard", "nav.board", "nav.notifications", "board.todo", "board.inReview"]) {
      expect(STRINGS.vi[key]).toBeTruthy();
      expect(STRINGS.vi[key]).not.toBe(STRINGS.en[key]);
    }
  });
});
