import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/manrope";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { NotificationStreamProvider } from "./contexts/NotificationStreamContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <NotificationStreamProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
          </NotificationStreamProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
