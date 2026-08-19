import React from "react";
import { render as baseRender, RenderOptions } from "@testing-library/react";
import { ConfirmProvider } from "../app/components/ConfirmDialog";
import { PreferencesProvider } from "../app/settings/PreferencesContext";

/**
 * Component tests mount one component at a time, so they miss the providers `main.tsx` wraps the
 * app in. `useConfirm` throws without its provider — deliberately, since a missing provider in the
 * real app is a wiring bug — so tests render through this instead of Testing Library directly.
 */
export const render = (ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  baseRender(ui, {
    wrapper: ({ children }) => (
      <PreferencesProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </PreferencesProvider>
    ),
    ...options,
  });

export * from "@testing-library/react";
