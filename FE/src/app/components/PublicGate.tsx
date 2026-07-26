import { useState } from "react";
import { Toaster } from "sonner";
import { LandingPage } from "./LandingPage";
import { AuthModule } from "./AuthModule";

type PublicView = "landing" | "auth";
type AuthEntry = "login" | "register";

export function PublicGate() {
  const [view, setView] = useState<PublicView>("landing");
  const [authEntry, setAuthEntry] = useState<AuthEntry>("login");

  if (view === "landing") {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LandingPage
          onSignIn={() => {
            setAuthEntry("login");
            setView("auth");
          }}
          onGetStarted={() => {
            setAuthEntry("register");
            setView("auth");
          }}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <AuthModule
        initialScreen={authEntry}
        onBackToLanding={() => setView("landing")}
      />
    </>
  );
}
