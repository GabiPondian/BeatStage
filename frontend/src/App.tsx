import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import {
  ProtectedRoute,
  PublicOnlyRoute
} from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AgendaPage } from "./pages/AgendaPage";
import { BandsPage } from "./pages/BandsPage";
import { BandDetailPage } from "./pages/BandDetailPage";
import { RepertoirePage } from "./pages/RepertoirePage";
import { EventsPage } from "./pages/EventsPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { RehearsalsPage } from "./pages/RehearsalsPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LiveModePage } from "./pages/LiveModePage";
import { NotFoundPage } from "./pages/NotFoundPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/ao-vivo" element={<LiveModePage />} />
          <Route path="/ao-vivo/:id" element={<LiveModePage />} />

          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/inicio" replace />} />
            <Route path="/inicio" element={<DashboardPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/bandas" element={<BandsPage />} />
            <Route path="/bandas/:id" element={<BandDetailPage />} />
            <Route path="/repertorio" element={<RepertoirePage />} />
            <Route path="/eventos" element={<EventsPage />} />
            <Route path="/eventos/:id" element={<EventDetailPage />} />
            <Route path="/ensaios" element={<RehearsalsPage />} />
            <Route path="/equipamentos" element={<EquipmentPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
