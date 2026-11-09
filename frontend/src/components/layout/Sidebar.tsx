import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Gauge,
  Guitar,
  ListMusic,
  MessageSquareQuote,
  Mic2,
  Radio,
  Speaker,
  UserRound,
  Users,
  X
} from "lucide-react";
import { Logo } from "../Logo";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useBandas } from "../../hooks/queries";
import { ledBands } from "../../lib/permissions";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_MAIN = [
  { to: "/inicio", label: "Início", icon: Gauge },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/bandas", label: "Minhas bandas", icon: Users }
];

const NAV_MANAGE = [
  { to: "/repertorio", label: "Repertório", icon: ListMusic },
  { to: "/eventos", label: "Eventos", icon: Guitar },
  { to: "/ensaios", label: "Ensaios", icon: Mic2 },
  { to: "/equipamentos", label: "Equipamentos", icon: Speaker },
  { to: "/feedback", label: "Feedback", icon: MessageSquareQuote }
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const { data: bandas } = useBandas();
  const lider = user ? ledBands(bandas ?? [], user.idMusico).length > 0 : false;

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "is-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar__head">
          <Logo to="/inicio" />
          <button
            type="button"
            className="icon-button sidebar__close"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Navegação principal">
          <span className="sidebar__section">Principal</span>
          {NAV_MAIN.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "is-active" : ""}`
              }
              onClick={onClose}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <span className="sidebar__section">Gestão</span>
          {NAV_MANAGE.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "is-active" : ""}`
              }
              onClick={onClose}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <span className="sidebar__section">Conta</span>
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `sidebar__link ${isActive ? "is-active" : ""}`
            }
            onClick={onClose}
          >
            <UserRound size={18} />
            <span>Meu perfil</span>
          </NavLink>
        </nav>

        <div className="sidebar__live">
          <span className="sidebar__live-icon">
            <Radio size={18} />
          </span>
          <div>
            <strong>Modo ao vivo</strong>
            <p>Acompanhe o setlist no palco.</p>
          </div>
          <NavLink to="/ao-vivo" className="sidebar__live-link" onClick={onClose}>
            Abrir
          </NavLink>
        </div>

        {user ? (
          <div className="sidebar__user">
            <Avatar name={user.nome} src={user.fotoPerfil} size="sm" />
            <div>
              <strong>{user.nome}</strong>
              <span>{lider ? "Líder de banda" : "Músico"}</span>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
