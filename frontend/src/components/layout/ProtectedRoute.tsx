import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "../../components/Logo";

export function AuthSplash() {
  return (
    <div className="auth-splash">
      <Logo size="lg" />
      <span className="auth-splash__loader" aria-label="Carregando" />
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <AuthSplash />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === "loading") {
    return <AuthSplash />;
  }

  if (status === "authenticated") {
    return <Navigate to="/inicio" replace />;
  }

  return <Outlet />;
}
