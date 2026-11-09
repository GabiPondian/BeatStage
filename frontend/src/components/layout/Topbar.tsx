import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Guitar,
  LogOut,
  Menu,
  Mic2,
  UserRound
} from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useAgendas, useBandas, useEnsaios, useEventos } from "../../hooks/queries";
import { ledBands } from "../../lib/permissions";
import {
  daysUntil,
  firstName,
  formatDateShort,
  parseDateOnly,
  sortByDateAndTime
} from "../../lib/format";

interface TopbarProps {
  onOpenMenu: () => void;
}

type ReminderKind = "evento" | "ensaio" | "agenda";

interface Reminder {
  key: string;
  kind: ReminderKind;
  title: string;
  date: string;
  meta: string;
  to: string;
}

const TITLES: Record<string, string> = {
  inicio: "Início",
  agenda: "Agenda",
  bandas: "Minhas bandas",
  repertorio: "Repertório",
  eventos: "Eventos",
  ensaios: "Ensaios",
  equipamentos: "Equipamentos",
  feedback: "Feedback",
  perfil: "Meu perfil",
  "ao-vivo": "Modo ao vivo"
};

function titleFor(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "inicio";

  if (first === "bandas" && segments[1]) return "Detalhes da banda";
  if (first === "eventos" && segments[1]) return "Detalhes do evento";
  return TITLES[first] ?? "BeatStage";
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: bandas } = useBandas();
  const { data: eventos } = useEventos();
  const { data: ensaios } = useEnsaios();
  const { data: agendas } = useAgendas();

  const bandaMap = useMemo(
    () => new Map((bandas ?? []).map((banda) => [banda.idBanda, banda.nome])),
    [bandas]
  );

  const reminders = useMemo<Reminder[]>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const inWindow = (value: string) => {
      const date = parseDateOnly(value);
      const diff = Math.round((date.getTime() - start.getTime()) / 86_400_000);
      return diff >= 0 && diff <= 14;
    };

    const items: Reminder[] = [];

    for (const evento of eventos ?? []) {
      if (!inWindow(evento.data)) continue;
      items.push({
        key: `evento-${evento.idEvento}`,
        kind: "evento",
        title: evento.nome,
        date: evento.data,
        meta: bandaMap.get(evento.idBanda) ?? "Show",
        to: `/eventos/${evento.idEvento}`
      });
    }

    for (const ensaio of ensaios ?? []) {
      if (!inWindow(ensaio.data)) continue;
      items.push({
        key: `ensaio-${ensaio.idEnsaio}`,
        kind: "ensaio",
        title: ensaio.descricao?.trim() || "Ensaio da banda",
        date: ensaio.data,
        meta: bandaMap.get(ensaio.idBanda) ?? "Ensaio",
        to: "/ensaios"
      });
    }

    for (const agenda of agendas ?? []) {
      if (agenda.concluido || !inWindow(agenda.data)) continue;
      items.push({
        key: `agenda-${agenda.idAgenda}`,
        kind: "agenda",
        title: agenda.titulo,
        date: agenda.data,
        meta: `${agenda.horario}${agenda.idBanda ? ` · ${bandaMap.get(agenda.idBanda) ?? "Banda"}` : ""}`,
        to: "/agenda"
      });
    }

    return sortByDateAndTime(items).slice(0, 8);
  }, [eventos, ensaios, agendas, bandaMap]);

  const unread = reminders.filter((item) => daysUntil(item.date) <= 7).length;

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setUserMenuOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const lider = ledBands(bandas ?? [], user.idMusico).length > 0;

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="icon-button topbar__menu"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <div className="breadcrumb" aria-label="Você está em">
          <span>BeatStage</span>
          <span className="breadcrumb__sep">/</span>
          <strong>{titleFor(location.pathname)}</strong>
        </div>
      </div>

      <div className="topbar__right">
        <div className="popover-anchor" ref={bellRef}>
          <button
            type="button"
            className="icon-button topbar__bell"
            aria-label={`Avisos (${unread})`}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={19} />
            {unread > 0 ? <span className="topbar__bell-dot">{unread}</span> : null}
          </button>

          {notificationsOpen ? (
            <div className="popover popover--notifications">
              <div className="popover__head">
                <strong>Avisos do palco</strong>
                <span>{unread} nos próximos 7 dias</span>
              </div>
              {reminders.length === 0 ? (
                <p className="popover__empty">Nenhum compromisso nos próximos dias.</p>
              ) : (
                <ul className="reminder-list">
                  {reminders.map((item) => (
                    <li key={item.key}>
                      <Link
                        to={item.to}
                        onClick={() => setNotificationsOpen(false)}
                        className="reminder"
                      >
                        <span className={`reminder__icon reminder__icon--${item.kind}`}>
                          {item.kind === "evento" ? (
                            <Guitar size={15} />
                          ) : item.kind === "ensaio" ? (
                            <Mic2 size={15} />
                          ) : (
                            <CalendarDays size={15} />
                          )}
                        </span>
                        <span className="reminder__body">
                          <strong>{item.title}</strong>
                          <span>
                            {formatDateShort(item.date)} · {item.meta}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="popover__foot" to="/agenda" onClick={() => setNotificationsOpen(false)}>
                Ver agenda completa
              </Link>
            </div>
          ) : null}
        </div>

        <div className="popover-anchor" ref={userMenuRef}>
          <button
            type="button"
            className="user-chip"
            onClick={() => setUserMenuOpen((open) => !open)}
            aria-expanded={userMenuOpen}
            aria-label="Menu da conta"
          >
            <Avatar name={user.nome} src={user.fotoPerfil} size="sm" />
            <span className="user-chip__text">
              <strong>{firstName(user.nome)}</strong>
              <small>{lider ? "Líder de banda" : "Músico"}</small>
            </span>
            <ChevronDown size={15} />
          </button>

          {userMenuOpen ? (
            <div className="popover popover--user">
              <div className="popover__user">
                <Avatar name={user.nome} src={user.fotoPerfil} size="md" />
                <div>
                  <strong>{user.nome}</strong>
                  <span>{user.email}</span>
                </div>
              </div>
              <button
                type="button"
                className="popover__item"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate("/perfil");
                }}
              >
                <UserRound size={16} />
                Meu perfil
              </button>
              <button
                type="button"
                className="popover__item popover__item--danger"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut size={16} />
                Sair da conta
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
