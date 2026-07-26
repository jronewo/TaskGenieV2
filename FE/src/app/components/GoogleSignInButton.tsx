import React, { useEffect, useRef } from "react";
import { mountGoogleButton } from "../../lib/googleAuth";

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onCredential, disabled }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    mountGoogleButton(container, (token) => callbackRef.current(token)).catch(() => {
      if (!cancelled && container) {
        container.innerHTML =
          '<p class="text-xs text-red-600 text-center">Could not load Google Sign-In</p>';
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full flex justify-center min-h-[44px] ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      aria-label="Sign in with Google"
    />
  );
}
