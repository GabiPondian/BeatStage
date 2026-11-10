import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  CalendarDays,
  ChevronDown,
  Guitar,
  Hand,
  LogOut,
  Menu,
  Mic2,
  Music2,
  UserRound
} from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import {
  useAgendas,
  useBandas,
  useEnsaios,
  useEventos,
  useNotificacoes,
  queryKeys
} from "../../hooks/queries";
import { ledBands } from "../../lib/permissions";
import {
  firstName,
  formatDateShort,
  formatRelativeTime,
  parseDateOnly,
  sortByDateAndTime
} from "../../lib/format";
import {
  permissaoNotificacao,
  pedirPermissaoNotificacao
} from "../../lib/browserNotifications";
import { notificacoesService } from "../../services/notificacoes.service";
import type { Notificacao } from "../../types/api";

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

function IconeNotificacao({ tipo }: { tipo: Notificacao["tipo"] }) {
  if (tipo === "ENTRADA") return <Music2 size={15} />;
  if (tipo === "CUTUCAR") return <Hand size={15} />;
  return <BellRing size={15} />;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [permissao, setPermissao] = useState(permissaoNotificacao());
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: bandas } = useBandas();
  const { data: eventos } = useEventos();
  const { data: ensaios } = useEnsaios();
  const { data: agendas } = useAgendas();
  const { data: notificacoes } = useNotificacoes();

  const listaNotificacoes = notificacoes ?? [];
  const naoLidas = listaNotificacoes.filter((item) => !item.lida).length;

  const marcarLida = useMutation({
    mutationFn: (id: number) => notificacoesService.marcarLida(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificacoes });
    }
  });

  const marcarTodas = useMutation({
    mutationFn: () => notificacoesService.marcarTodasLidas(),
    onSuccess: (resposta) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificacoes });
      toast.success(
        "Notificações lidas",
        `${resposta.quantidade} ${resposta.quantidade === 1 ? "aviso" : "avisos"} marcados como lidos.`
      );
    },
    onError: () => toast.error("Não foi possível atualizar as notificações")
  });

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

    return sortByDateAndTime(items).slice(0, 6);
  }, [eventos, ensaios, agendas, bandaMap]);

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

  function abrirNotificacao(notificacao: Notificacao) {
    if (!notificacao.lida) {
      marcarLida.mutate(notificacao.idNotificacao);
    }

    setNotificationsOpen(false);

    if (notificacao.idEvento) {
      navigate(`/ao-vivo/${notificacao.idEvento}`);
    } else if (notificacao.idBanda) {
      navigate(`/bandas/${notificacao.idBanda}`);
    }
  }

  async function ativarNotificacoesNavegador() {
    const resultado = await pedirPermissaoNotificacao();
    setPermissao(resultado);

    if (resultado === "granted") {
      toast.success(
        "Notificações do navegador ativadas",
        "Você será avisado mesmo com o BeatStage em outra aba."
      );
    } else if (resultado === "denied") {
      toast.error(
        "Notificações bloqueadas",
        "Libere as notificações nas permissões do navegador."
      );
    } else if (resultado === "indisponivel") {
      toast.info("Este navegador não suporta notificações nativas");
    }
  }

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
            aria-label={`Notificações (${naoLidas})`}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell size={19} />
            {naoLidas > 0 ? <span className="topbar__bell-dot">{naoLidas}</span> : null}
          </button>

          {notificationsOpen ? (
            <div className="popover popover--notifications">
              <div className="popover__head">
                <strong>Notificações</strong>
                <span>
                  {naoLidas} {naoLidas === 1 ? "não lida" : "não lidas"} ·{" "}
                  {listaNotificacoes.length} no total
                </span>
              </div>

              {listaNotificacoes.length === 0 ? (
                <p className="popover__empty">
                  Nenhuma notificação ainda. As entradas e cutucadas do palco aparecem aqui.
                </p>
              ) : (
                <ul className="notification-feed">
                  {listaNotificacoes.slice(0, 8).map((notificacao) => (
                    <li key={notificacao.idNotificacao}>
                      <button
                        type="button"
                        className={`notification-item ${notificacao.lida ? "" : "is-unread"}`}
                        onClick={() => abrirNotificacao(notificacao)}
                      >
                        <span
                          className={`notification-item__icon notification-item__icon--${notificacao.tipo.toLowerCase()}`}
                        >
                          <IconeNotificacao tipo={notificacao.tipo} />
                        </span>
                        <span className="notification-item__body">
                          <strong>{notificacao.titulo}</strong>
                          <span>{notificacao.mensagem}</span>
                          <small>
                            {formatRelativeTime(notificacao.criadoEm)}
                            {notificacao.evento ? ` · ${notificacao.evento}` : ""}
                          </small>
                        </span>
                        {!notificacao.lida ? (
                          <span className="notification-item__dot" aria-label="Não lida" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="notification-actions">
                {naoLidas > 0 ? (
                  <button
                    type="button"
                    className="notification-actions__button"
                    onClick={() => marcarTodas.mutate()}
                    disabled={marcarTodas.isPending}
                  >
                    Marcar todas como lidas
                  </button>
                ) : null}

                {permissao === "default" ? (
                  <button
                    type="button"
                    className="notification-actions__button"
                    onClick={() => void ativarNotificacoesNavegador()}
                  >
                    Ativar notificações do navegador
                  </button>
                ) : permissao === "granted" ? (
                  <span className="notification-actions__status">
                    Notificações do navegador ativas
                  </span>
                ) : permissao === "denied" ? (
                  <span className="notification-actions__status">
                    Notificações bloqueadas pelo navegador
                  </span>
                ) : null}
              </div>

              <div className="popover__divider" />

              <div className="popover__section-head">
                <strong>Próximos compromissos</strong>
                <span>{reminders.length} nos próximos 14 dias</span>
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

              <Link
                className="popover__foot"
                to="/agenda"
                onClick={() => setNotificationsOpen(false)}
              >
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
