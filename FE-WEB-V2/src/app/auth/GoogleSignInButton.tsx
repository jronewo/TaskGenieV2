import { useEffect, useRef, useState } from "react";

// Minimal ambient shape for the Google Identity Services script (window.google.accounts.id).
// No @types package is installed for this; we only use the handful of members below.
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In script.")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  clientId: string;
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}

/** Renders the real Google Identity Services button and forwards the ID token it produces. */
export const GoogleSignInButton = ({ clientId, onCredential, onError }: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Keep the latest callback props available to the GIS `callback`, which is registered once
  // per `clientId` — without this, the closure would keep calling a stale render's props.
  const callbacksRef = useRef({ onCredential, onError });
  useEffect(() => {
    callbacksRef.current = { onCredential, onError };
  }, [onCredential, onError]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const container = containerRef.current;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !container || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) callbacksRef.current.onCredential(response.credential);
            else callbacksRef.current.onError("Google did not return a credential.");
          },
        });
        // GIS appends a fresh iframe on every renderButton call; clear first so a remount
        // (e.g. React StrictMode's mount/cleanup/mount cycle) never leaves duplicate buttons.
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 336,
          text: "continue_with",
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed(true);
        callbacksRef.current.onError(err instanceof Error ? err.message : "Failed to load Google Sign-In.");
      });

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [clientId]);

  if (!clientId || failed) {
    return (
      <p className="text-xs text-gray-400 text-center border border-gray-200 rounded-lg py-2.5 select-none">
        Google sign-in is unavailable right now.
      </p>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
};
