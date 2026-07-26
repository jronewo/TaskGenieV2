import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "../core/auth/AuthContext";
import { queryClient } from "../core/lib/queryClient";
import { AppRouter } from "../core/router/AppRouter";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}
