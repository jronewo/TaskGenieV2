const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  "546829754931-6r0b88k05n54o0e9vc25dokke7i3eu7g.apps.googleusercontent.com";

let scriptPromise: Promise<void> | null = null;
let initialized = false;
let activeCallback: ((idToken: string) => void) | null = null;

export function getGoogleClientId(): string {
  return GOOGLE_CLIENT_ID;
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

async function ensureGoogleInitialized(): Promise<void> {
  await loadGoogleIdentityScript();
  if (!window.google?.accounts?.id) {
    throw new Error("Google Sign-In is unavailable");
  }
  if (!initialized) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => activeCallback?.(response.credential),
    });
    initialized = true;
  }
}

export async function mountGoogleButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void
): Promise<void> {
  activeCallback = onCredential;
  await ensureGoogleInitialized();
  container.innerHTML = "";
  const width = Math.max(container.offsetWidth, 280);
  window.google!.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    width,
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "left",
  });
}
