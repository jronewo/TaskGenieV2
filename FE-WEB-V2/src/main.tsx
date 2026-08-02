
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { AuthProvider } from "./app/auth/AuthContext";
  import { PreferencesProvider } from "./app/settings/PreferencesContext";
  import { ConfirmProvider } from "./app/components/ConfirmDialog";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <PreferencesProvider>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
