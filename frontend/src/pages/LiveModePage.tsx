import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  ListMusic,
  Maximize,
  Music2,
  Pause,
  Play,
  Radio,
  RotateCcw
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { DateBadge } from "../components/ui/DateBadge";
import { useAuth } from "../contexts/AuthContext";
import {
  useBandas,
  useEventos,
  useMusicos,
  useRepertorios
} from "../hooks/queries";
import {
  formatDateLong,
  formatDuration,
  formatTotalDuration,
  isPastDate,
  sortByDateAndTime
} from "../lib/format";
import { canManageBand } from "../lib/permissions";
import { useToast } from "../contexts/ToastContext";

interface LiveState {
  order: number[];
  current: number;
  played: number[];
  iniciadoEm: string | null;
}

function storageKey(idEvento: number): string {
  return `beatstage.live.evento.${idEvento}`;
}

function readState(idEvento: number): LiveState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(idEvento));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LiveState>;
    if (!Array.isArray(parsed.order)) return null;
    return {
      order: parsed.order.filter((id): id is number => typeof id === "number"),
      current: typeof parsed.current === "number" ? parsed.current : 0,
      played: Array.isArray(parsed.played)
        ? parsed.played.filter((id): id is number => typeof id === "number")
        : [],
      iniciadoEm: typeof parsed.iniciadoEm === "string" ? parsed.iniciadoEm : null
    };
  } catch {
    return null;
  }
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LiveModePage() {
  const { id } = useParams<{ id: string }>();
  const idEvento = Number(id);
  const { user } = useAuth();
  const toast = useToast();

  const eventsQuery = useEventos();
  const bandsQuery = useBandas();
  const repertoiresQuery = useRepertorios();
  const musicosQuery = useMusicos();

  const eventos = eventsQuery.data ?? [];
  const bandas = bandsQuery.data ?? [];
  const repertorios = repertoiresQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];

  const evento = Number.isFinite(idEvento)
    ? eventos.find((item) => item.idEvento === idEvento)
    : undefined;
  const banda = bandas.find((item) => item.idBanda === evento?.idBanda);

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const [state, setState] = useState<LiveState | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const eventoIds = evento?.idRepertorios.join(",") ?? "";

  const setlist = useMemo(() => {
    if (!evento || !state) return [];
    return state.order
      .map((idRepertorio) =>
        repertorios.find((item) => item.idRepertorio === idRepertorio)
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [evento, repertorios, state]);

  const atual = state ? setlist[state.current] : undefined;
  const proxima = state ? setlist[state.current + 1] : undefined;
  const tocadas = useMemo(
    () => new Set(state?.played ?? []),
    [state?.played]
  );
  const totalSegundos = setlist.reduce(
    (total, item) => total + (item.duracaoSegundos ?? 0),
    0
  );
  const tocadasSegundos = setlist
    .filter((item) => tocadas.has(item.idRepertorio))
    .reduce((total, item) => total + (item.duracaoSegundos ?? 0), 0);

  // Restaura e reconcilia o estado local do evento sempre que o setlist do backend muda.
  useEffect(() => {
    if (!evento) return;
    const ids = evento.idRepertorios;
    const saved = readState(evento.idEvento);
    const baseOrder = (saved?.order ?? []).filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !baseOrder.includes(id));
    const order = [...baseOrder, ...missing];
    const current = Math.min(saved?.current ?? 0, Math.max(order.length - 1, 0));
    const played = (saved?.played ?? []).filter((id) => order.includes(id));

    setState({
      order,
      current,
      played,
      iniciadoEm: saved?.iniciadoEm ?? null
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evento?.idEvento, eventoIds]);

  // Persiste o andamento para sobreviver a um recarregamento durante o show.
  useEffect(() => {
    if (!evento || !state) return;
    try {
      window.localStorage.setItem(storageKey(evento.idEvento), JSON.stringify(state));
    } catch {
      /* armazenamento indisponível */
    }
  }, [evento, state]);

  useEffect(() => {
    if (!state?.iniciadoEm) return;
    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state?.iniciadoEm]);

  const avancar = useCallback(() => {
    setState((current) =>
      current
        ? { ...current, current: Math.min(current.current + 1, current.order.length - 1) }
        : current
    );
  }, []);

  const voltar = useCallback(() => {
    setState((current) =>
      current ? { ...current, current: Math.max(current.current - 1, 0) } : current
    );
  }, []);

  const marcarTocada = useCallback(() => {
    setState((current) => {
      if (!current) return current;
      const idAtual = current.order[current.current];
      if (!idAtual) return current;
      const played = current.played.includes(idAtual)
        ? current.played
        : [...current.played, idAtual];
      const nextIndex = Math.min(current.current + 1, current.order.length - 1);
      return { ...current, played, current: nextIndex };
    });
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        avancar();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        voltar();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [avancar, voltar]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.info("Tela cheia indisponível", "Seu navegador bloqueou o modo tela cheia.");
    }
  }

  if (eventsQuery.isLoading || bandsQuery.isLoading || repertoiresQuery.isLoading) {
    return (
      <div className="live-page live-page--loading">
        <Logo variant="light" />
        <span className="auth-splash__loader" />
      </div>
    );
  }

  if (!evento) {
    return <LiveEventPicker />;
  }

  if (!state) {
    return (
      <div className="live-page live-page--loading">
        <Logo variant="light" />
        <span className="auth-splash__loader" />
      </div>
    );
  }

  const isLider = Boolean(
    user && banda && canManageBand(bandas, evento.idBanda, user.idMusico)
  );

  const decorrido = state?.iniciadoEm
    ? Math.floor((agora - new Date(state.iniciadoEm).getTime()) / 1000)
    : 0;

  function resetar() {
    if (!evento) return;
    setState((current) =>
      current
        ? { ...current, current: 0, played: [], iniciadoEm: null }
        : current
    );
  }

  if (state && setlist.length === 0) {
    return (
      <div className="live-page">
        <LiveHeader eventoId={evento.idEvento} nome={evento.nome} banda={banda?.nome} isLider={isLider} />
        <main className="live-empty">
          <EmptyState
            icon={ListMusic}
            title="Este evento ainda não tem setlist"
            description="Vincule músicas ao evento para usar o modo ao vivo."
            action={
              <Link to={`/eventos/${evento.idEvento}`} className="btn btn--primary btn--md">
                Abrir evento
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="live-page">
      <LiveHeader
        eventoId={evento.idEvento}
        nome={evento.nome}
        banda={banda?.nome}
        isLider={isLider}
        onFullscreen={() => void toggleFullscreen()}
      />

      <div className="live-meta-bar">
        <span>{formatDateLong(evento.data)}</span>
        <span className="live-meta-bar__sep" />
        <span>
          <Clock size={14} /> {formatTotalDuration(totalSegundos)} de setlist
        </span>
        <span className="live-meta-bar__sep" />
        <span>
          {tocadas.size} de {setlist.length} tocadas
        </span>
        {state?.iniciadoEm ? (
          <span className="live-meta-bar__timer">
            <Radio size={14} /> No palco há {formatClock(decorrido)}
          </span>
        ) : (
          <button
            type="button"
            className="live-start"
            onClick={() =>
              setState((current) =>
                current ? { ...current, iniciadoEm: new Date().toISOString() } : current
              )
            }
          >
            <Play size={14} /> Iniciar show
          </button>
        )}
        <button type="button" className="live-reset" onClick={resetar}>
          <RotateCcw size={14} /> Reiniciar
        </button>
      </div>

      <main className="live-content">
        <section className="live-now">
          <div className="live-now__head">
            <span className="live-now__label">
              <span className="live-dot" /> No palco agora
            </span>
            <span className="live-now__index">
              {String((state?.current ?? 0) + 1).padStart(2, "0")} /{" "}
              {String(setlist.length).padStart(2, "0")}
            </span>
          </div>

          {atual ? (
            <>
              <div className="live-now__title-row">
                <h1>{atual.musica}</h1>
                <span className="live-tom">{atual.tom ?? "—"}</span>
              </div>

              <div className="live-now__meta">
                <span>
                  <Clock size={16} /> {formatDuration(atual.duracaoSegundos)}
                </span>
                <span>
                  <Music2 size={16} /> {atual.musicos.length} músicos
                </span>
                {atual.observacao ? <span>{atual.observacao}</span> : null}
              </div>

              <div className="live-entries">
                <span className="live-entries__label">Entradas desta música</span>
                {atual.musicos.length === 0 ? (
                  <p className="muted">
                    O líder não definiu os músicos desta música. As entradas aparecem aqui
                    quando o repertório é detalhado.
                  </p>
                ) : (
                  <div className="live-entry-grid">
                    {atual.musicos.map((item) => {
                      const musico = musicosMap.get(item.idMusico);
                      return (
                        <div key={item.idMusico} className="live-entry">
                          <Avatar
                            name={musico?.nome ?? `Músico ${item.idMusico}`}
                            src={musico?.fotoPerfil}
                            size="sm"
                          />
                          <div>
                            <strong>{musico?.nome ?? `Músico #${item.idMusico}`}</strong>
                            <span>{item.funcaoMusico || "Entrada não definida"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="live-controls">
                <button
                  type="button"
                  className="live-control"
                  onClick={voltar}
                  disabled={(state?.current ?? 0) === 0}
                >
                  <ChevronLeft size={22} />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  className="live-control live-control--main"
                  onClick={marcarTocada}
                  disabled={tocadas.has(atual.idRepertorio)}
                >
                  {tocadas.has(atual.idRepertorio) ? <Check size={22} /> : <Pause size={22} />}
                  <span>{tocadas.has(atual.idRepertorio) ? "Já marcada" : "Concluir e avançar"}</span>
                </button>

                <button
                  type="button"
                  className="live-control"
                  onClick={avancar}
                  disabled={(state?.current ?? 0) >= setlist.length - 1}
                >
                  <ChevronRight size={22} />
                  <span>Próxima</span>
                </button>
              </div>
            </>
          ) : null}
        </section>

        <aside className="live-side">
          <div className="live-next-card">
            <span className="live-next-card__label">A seguir</span>
            {proxima ? (
              <>
                <strong>{proxima.musica}</strong>
                <span>
                  {proxima.tom ?? "—"} · {formatDuration(proxima.duracaoSegundos)}
                </span>
              </>
            ) : (
              <span>Última música do setlist.</span>
            )}
          </div>

          <div className="live-progress">
            <div className="live-progress__head">
              <span>Progresso do show</span>
              <strong>{Math.round((tocadas.size / setlist.length) * 100)}%</strong>
            </div>
            <div className="live-progress__bar">
              <span style={{ width: `${(tocadas.size / setlist.length) * 100}%` }} />
            </div>
            <span className="live-progress__time">
              {formatTotalDuration(tocadasSegundos)} tocados ·{" "}
              {formatTotalDuration(Math.max(totalSegundos - tocadasSegundos, 0))} restantes
            </span>
          </div>

          <div className="live-setlist">
            <div className="live-setlist__head">
              <span>Setlist</span>
              <ListMusic size={16} />
            </div>
            <ol>
              {setlist.map((musica, index) => {
                const isCurrent = index === state?.current;
                const isPlayed = tocadas.has(musica.idRepertorio);
                return (
                  <li key={musica.idRepertorio}>
                    <button
                      type="button"
                      className={`live-song ${isCurrent ? "is-current" : ""} ${isPlayed ? "is-played" : ""}`}
                      onClick={() =>
                        setState((current) =>
                          current ? { ...current, current: index } : current
                        )
                      }
                    >
                      <span className="live-song__index">
                        {isPlayed ? <Check size={14} /> : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="live-song__body">
                        <strong>{musica.musica}</strong>
                        <span>
                          {musica.tom ?? "—"} · {formatDuration(musica.duracaoSegundos)}
                        </span>
                      </span>
                      {isCurrent ? <span className="live-song__badge">Agora</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="live-note">
            <Info size={15} />
            <p>
              O andamento do setlist fica salvo neste dispositivo. A sincronização e os
              alertas em tempo real entre celulares exigem um canal de comunicação que o
              backend atual não oferece.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function LiveHeader({
  eventoId,
  nome,
  banda,
  isLider,
  onFullscreen
}: {
  eventoId: number;
  nome: string;
  banda?: string;
  isLider?: boolean;
  onFullscreen?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="live-topbar">
      <div className="live-topbar__left">
        <button
          type="button"
          className="icon-button"
          onClick={() => navigate(`/eventos/${eventoId}`)}
          aria-label="Sair do modo ao vivo"
        >
          <ArrowLeft size={19} />
        </button>
        <Logo variant="light" />
        <span className="live-topbar__divider" />
        <div className="live-topbar__event">
          <strong>{nome}</strong>
          <span>{banda ?? "Banda"}</span>
        </div>
      </div>

      <div className="live-topbar__right">
        <Badge tone="purple" dot>
          <Radio size={12} /> Modo ao vivo
        </Badge>
        {isLider ? <Badge tone="yellow">Você controla</Badge> : null}
        {onFullscreen ? (
          <button type="button" className="icon-button" onClick={onFullscreen} aria-label="Tela cheia">
            <Maximize size={18} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

function LiveEventPicker() {
  const eventsQuery = useEventos();
  const bandsQuery = useBandas();
  const repertoiresQuery = useRepertorios();

  const eventos = sortByDateAndTime(
    (eventsQuery.data ?? []).filter((evento) => !isPastDate(evento.data))
  );
  const bandas = bandsQuery.data ?? [];
  const repertorios = repertoiresQuery.data ?? [];
  const bandaMap = new Map(bandas.map((banda) => [banda.idBanda, banda.nome]));

  return (
    <div className="live-page">
      <header className="live-topbar">
        <div className="live-topbar__left">
          <Link to="/inicio" className="icon-button" aria-label="Voltar ao painel">
            <ArrowLeft size={19} />
          </Link>
          <Logo variant="light" />
          <span className="live-topbar__divider" />
          <div className="live-topbar__event">
            <strong>Modo ao vivo</strong>
            <span>Escolha a apresentação</span>
          </div>
        </div>
        <Badge tone="purple" dot>
          <Radio size={12} /> Palco
        </Badge>
      </header>

      <main className="live-picker">
        <div className="live-picker__intro">
          <span className="eyebrow">Setlist no palco</span>
          <h1>Qual show vamos acompanhar?</h1>
          <p>
            Abra o setlist de um evento para ver a música atual, a próxima e as entradas de
            cada músico — com controle de andamento.
          </p>
        </div>

        {eventos.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Nenhum evento próximo"
            description="Cadastre um evento com repertório para abrir o modo ao vivo."
            action={
              <Link to="/eventos" className="btn btn--primary btn--md">
                Ir para eventos
              </Link>
            }
          />
        ) : (
          <div className="live-picker__grid">
            {eventos.map((evento) => {
              const setlist = evento.idRepertorios
                .map((id) => repertorios.find((item) => item.idRepertorio === id))
                .filter(Boolean);
              const duracao = setlist.reduce(
                (total, item) => total + (item?.duracaoSegundos ?? 0),
                0
              );

              return (
                <Link
                  key={evento.idEvento}
                  to={`/ao-vivo/${evento.idEvento}`}
                  className="live-picker-card"
                >
                  <DateBadge date={evento.data} variant="light" size="md" />
                  <div className="live-picker-card__body">
                    <Badge tone="purple">{bandaMap.get(evento.idBanda) ?? "Banda"}</Badge>
                    <h2>{evento.nome}</h2>
                    <span>
                      {setlist.length} músicas · {formatTotalDuration(duracao)}
                    </span>
                  </div>
                  <ArrowRight size={18} />
                </Link>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="live-picker__back"
          onClick={() => window.history.back()}
        >
          <ArrowLeft size={15} /> Voltar
        </button>
      </main>
    </div>
  );
}
