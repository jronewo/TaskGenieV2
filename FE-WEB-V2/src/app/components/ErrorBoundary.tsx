import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Changing this resets the boundary — pass the active page so navigating away clears the error. */
  resetKey?: string | number;
}

interface State {
  error: Error | null;
}

/**
 * Keeps a render-time crash contained to one region instead of blanking the entire application.
 *
 * This exists because a `TypeError` thrown inside a `setState` updater (for example dereferencing
 * an empty 204 response) unmounts the whole React tree, leaving a white screen with no way back.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(previous: Props) {
    // Navigating to another page should clear a stale error rather than trapping the user.
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Render error contained by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle size={28} className="text-red-500" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-gray-900">This section ran into a problem.</p>
          <p className="mt-1 text-xs text-gray-500">
            The rest of the app is still working — you can retry or switch to another page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1A237E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0D1757]"
        >
          <RotateCcw size={12} aria-hidden />
          Try again
        </button>
      </div>
    );
  }
}
