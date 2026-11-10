import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hand,
  Info,
  ListMusic,
  Maximize,
  Music2,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  Square,
  Users
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { DateBadge } from "../components/ui/DateBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Modal } from "../components/ui/Modal";
import { Field, Select, Textarea } from "../components/ui/Field";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  useBandas,
  useEventos,
  useMusicos,
  useNotificacoes,
  useRepertorios,
  queryKeys
} from "../hooks/queries";
import { aoVivoService } from "../services/aoVivo.service";
import { letrasService } from "../services/letras.service";
import { abrirStream } from "../lib/stream";
import {
  formatDateLong,
  formatDuration,
  formatRelativeTime,
  formatTotalDuration,
  isPastDate,
  sortByDateAndTime
} from "../lib/format";
import { canManageBand } from "../lib/permissions";
import { mensagemDeErro } from "../lib/api";
import type {
  AcaoAoVivo,
  EstadoAoVivo,
  Musico,
  Notificacao,
  SetlistAoVivoItem
} from "../types/api";

function formatClock(totalSeconds: number): string {
  const seguro = Math.max(0, Math.floor(totalSeconds));
  const horas = Math.floor(seguro / 3600);
  const minutos = Math.floor((seguro % 3600) / 60);
  const segundos = seguro % 60;

  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`
    : `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function iconeAlerta(tipo: Notificacao["tipo"]) {
  if (tipo === "ENTRADA") return <Music2 size={14} />;
  if (tipo === "CUTUCAR") return <Hand size={14} />;
  return <BellRing size={14} />;
}

export function LiveModePage() {
  const { id } = useParams<{ id: string }>();
  const idEvento = Number(id);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const bandasQuery = useBandas();
  const musicosQuery = useMusicos();
  const notificacoesQuery = useNotificacoes();

  const [agora, setAgora] = useState(() => Date.now());
  const [mostrarLetra, setMostrarLetra] = useState(true);
  const [cutucar, setCutucar] = useState<{ open: boolean; alvo?: number }>({
    open: false
  });

  const estadoQuery = useQuery<EstadoAoVivo>({
    queryKey: queryKeys.aoVivo(idEvento),
    queryFn: () => aoVivoService.estado(idEvento),
    enabled: Number.isInteger(idEvento) && idEvento > 0,
    refetchInterval: 5000,
    staleTime: 0,
    retry: 1
  });

  // O SSE entrega o estado imediatamente; o polling de 5s é apenas uma rede de segurança.
  useEffect(() => {
    if (!estadoQuery.isSuccess || !user) return;

    let encerrado = false;
    let reconexao: number | undefined;
    let conexao: { close: () => void } | undefined;

    const conectar = () => {
      if (encerrado) return;

      conexao = abrirStream(
        `/ao-vivo/${idEvento}/stream`,
        (evento, dados) => {
          if (evento === "state" && dados && typeof dados === "object") {
            queryClient.setQueryData(queryKeys.aoVivo(idEvento), dados);
          }
        },
        () => {
          if (encerrado) return;
          reconexao = window.setTimeout(conectar, 5000);
        }
      );
    };

    conectar();

    return () => {
      encerrado = true;
      conexao?.close();
      if (reconexao) window.clearTimeout(reconexao);
    };
  }, [estadoQuery.isSuccess, idEvento, queryClient, user]);

  useEffect(() => {
    if (estadoQuery.data?.status !== "RODANDO") return;

    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [estadoQuery.data?.status]);

  const controlar = useMutation({
    mutationFn: (dados: { acao: AcaoAoVivo; idRepertorio?: number }) =>
      aoVivoService.controlar(idEvento, dados),
    onSuccess: (novoEstado, variaveis) => {
      queryClient.setQueryData(queryKeys.aoVivo(idEvento), novoEstado);

      if (variaveis.acao === "INICIAR" || variaveis.acao === "REINICIAR") {
        toast.success("Show no palco", "O modo ao vivo começou. Bom show!");
      } else if (variaveis.acao === "ENCERRAR") {
        toast.info("Show encerrado", "O setlist ficou registrado no evento.");
      }
    },
    onError: (error) =>
      toast.error("Não foi possível controlar o palco", mensagemDeErro(error))
  });

  const cutucarMutation = useMutation({
    mutationFn: (dados: { alvo: string; mensagem: string }) =>
      aoVivoService.cutucar(idEvento, {
        mensagem: dados.mensagem.trim(),
        ...(dados.alvo !== "todos"
          ? { idMusicoDestino: Number(dados.alvo) }
          : {})
      }),
    onSuccess: (resposta) => {
      toast.success(
        "Alerta enviado",
        `${resposta.enviados} ${resposta.enviados === 1 ? "músico recebeu" : "músicos receberam"} a cutucada.`
      );
      setCutucar({ open: false });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificacoes });
    },
    onError: (error) => toast.error("Não foi possível enviar", mensagemDeErro(error))
  });

  const estado = estadoQuery.data;
  const banda = bandasQuery.data?.find((item) => item.idBanda === estado?.idBanda);
  const musicos = musicosQuery.data ?? [];
  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const membros = useMemo(() => {
    if (!banda) return [];
    const ids = Array.from(new Set([banda.idLider, ...banda.idMembros]));
    return ids
      .map((idMusico) => musicosMap.get(idMusico))
      .filter((musico): musico is Musico => Boolean(musico));
  }, [banda, musicosMap]);

  const isLider = Boolean(
    estado && user && canManageBand(bandasQuery.data ?? [], estado.idBanda, user.idMusico)
  );

  const notificacoesEvento = useMemo(
    () =>
      (notificacoesQuery.data ?? []).filter(
        (notificacao) => notificacao.idEvento === idEvento
      ),
    [notificacoesQuery.data, idEvento]
  );

  const setlistParaLetra = estado?.setlist ?? [];
  const atualParaLetra = setlistParaLetra.find(
    (item) => item.idRepertorio === estado?.idRepertorioAtual
  );

  const letraQuery = useQuery({
    queryKey: ["letra", atualParaLetra?.artista ?? "", atualParaLetra?.musica ?? ""],
    queryFn: () => {
      if (!atualParaLetra) throw new Error("Nenhuma música no palco");
      return letrasService.buscar(atualParaLetra.musica, atualParaLetra.artista);
    },
    enabled: Boolean(atualParaLetra) && mostrarLetra,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 6,
    retry: 0
  });

  if (!Number.isInteger(idEvento) || idEvento <= 0) {
    return <LiveEventPicker />;
  }

  if (estadoQuery.isLoading) {
    return (
      <div className="live-page live-page--loading">
        <Logo variant="light" />
        <span className="auth-splash__loader" aria-label="Carregando palco" />
      </div>
    );
  }

  if (estadoQuery.isError || !estado) {
    return (
      <div className="live-page">
        <header className="live-topbar">
          <div className="live-topbar__left">
            <Link to="/eventos" className="icon-button" aria-label="Voltar aos eventos">
              <ArrowLeft size={19} />
            </Link>
            <Logo variant="light" />
            <span className="live-topbar__divider" />
            <div className="live-topbar__event">
              <strong>Modo ao vivo</strong>
              <span>Palco</span>
            </div>
          </div>
        </header>
        <main className="live-empty">
          <ErrorState
            error={estadoQuery.error ?? new Error("Evento não encontrado")}
            onRetry={() => void estadoQuery.refetch()}
          />
        </main>
      </div>
    );
  }

  const setlist = estado.setlist;
  const indiceAtual = setlist.findIndex(
    (item) => item.idRepertorio === estado.idRepertorioAtual
  );
  const atual: SetlistAoVivoItem | undefined =
    indiceAtual >= 0 ? setlist[indiceAtual] : undefined;
  const proxima = indiceAtual >= 0 ? setlist[indiceAtual + 1] : setlist[0];
  const totalSegundos = setlist.reduce(
    (total, item) => total + (item.duracaoSegundos ?? 0),
    0
  );
  const tocadasConcluidas =
    estado.status === "ENCERRADO" && indiceAtual >= setlist.length - 1
      ? setlist.length
      : Math.max(indiceAtual, 0);
  const tocadasSegundos = setlist
    .slice(0, tocadasConcluidas)
    .reduce((total, item) => total + (item.duracaoSegundos ?? 0), 0);

  const musicaIniciadaEm = estado.musicaIniciadaEm
    ? new Date(estado.musicaIniciadaEm).getTime()
    : null;
  const showIniciadoEm = estado.iniciadoEm
    ? new Date(estado.iniciadoEm).getTime()
    : null;
  const decorridoMusica = musicaIniciadaEm
    ? Math.max(0, Math.floor((agora - musicaIniciadaEm) / 1000))
    : 0;
  const restanteMusica =
    atual?.duracaoSegundos !== null && atual?.duracaoSegundos !== undefined
      ? Math.max(0, atual.duracaoSegundos - decorridoMusica)
      : null;
  const progressoMusica =
    atual?.duracaoSegundos && atual.duracaoSegundos > 0
      ? Math.min(100, Math.round((decorridoMusica / atual.duracaoSegundos) * 100))
      : 0;
  const decorridoShow = showIniciadoEm
    ? Math.max(0, Math.floor((agora - showIniciadoEm) / 1000))
    : 0;
  const percentualShow =
    setlist.length > 0
      ? Math.round((tocadasConcluidas / setlist.length) * 100)
      : 0;

  const statusLabel =
    estado.status === "RODANDO"
      ? "Ao vivo"
      : estado.status === "ENCERRADO"
        ? "Encerrado"
        : "Aguardando início";

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast.info("Tela cheia indisponível", "Seu navegador bloqueou o modo tela cheia.");
    }
  }

  function abrirCutucar(idMusico?: number) {
    setCutucar({ open: true, alvo: idMusico });
  }

  return (
    <div className="live-page">
      <LiveHeader
        idEvento={idEvento}
        nome={estado.nomeEvento}
        banda={estado.nomeBanda}
        status={estado.status}
        isLider={isLider}
        onFullscreen={() => void toggleFullscreen()}
        onCutucar={() => abrirCutucar()}
      />

      <div className="live-meta-bar">
        <span>
          <CalendarDays size={14} /> {formatDateLong(estado.dataEvento)}
        </span>
        <span className="live-meta-bar__sep" />
        <span>
          <ListMusic size={14} /> {setlist.length} músicas ·{" "}
          {formatTotalDuration(totalSegundos)}
        </span>
        <span className="live-meta-bar__sep" />
        <span className={`live-status live-status--${estado.status.toLowerCase()}`}>
          <span className="live-dot" /> {statusLabel}
        </span>
        {estado.status === "RODANDO" && showIniciadoEm ? (
          <span className="live-meta-bar__timer">
            <Radio size={14} /> No palco há {formatClock(decorridoShow)}
          </span>
        ) : null}
        {isLider ? (
          <span className="live-meta-bar__actions">
            <button
              type="button"
              className="live-reset"
              onClick={() => controlar.mutate({ acao: "REINICIAR" })}
              disabled={controlar.isPending}
            >
              <RotateCcw size={14} /> Reiniciar
            </button>
            {estado.status === "RODANDO" ? (
              <button
                type="button"
                className="live-reset live-reset--danger"
                onClick={() => controlar.mutate({ acao: "ENCERRAR" })}
                disabled={controlar.isPending}
              >
                <Square size={13} /> Encerrar
              </button>
            ) : null}
          </span>
        ) : (
          <span className="live-meta-bar__viewer">
            <Users size={14} /> Acompanhando o líder
          </span>
        )}
      </div>

      <main className="live-content">
        <section className={`live-now ${estado.status !== "RODANDO" ? "live-now--standby" : ""}`}>
          <div className="live-now__head">
            <span className="live-now__label">
              {estado.status === "RODANDO" ? <span className="live-dot" /> : <Radio size={12} />}
              {estado.status === "RODANDO"
                ? "No palco agora"
                : estado.status === "ENCERRADO"
                  ? "Show encerrado"
                  : "Palco pronto"}
            </span>
            {setlist.length > 0 ? (
              <span className="live-now__index">
                {String(Math.max(indiceAtual + 1, 0)).padStart(2, "0")} /{" "}
                {String(setlist.length).padStart(2, "0")}
              </span>
            ) : null}
          </div>

          {setlist.length === 0 ? (
            <div className="live-standby">
              <EmptyState
                icon={ListMusic}
                title="Este evento não tem setlist"
                description="Vincule músicas ao evento para abrir o palco ao vivo."
                action={
                  <Link to={`/eventos/${idEvento}`} className="btn btn--primary btn--md">
                    Abrir evento
                  </Link>
                }
              />
            </div>
          ) : estado.status !== "RODANDO" || !atual ? (
            <div className="live-standby">
              <span className="live-standby__icon">
                {estado.status === "ENCERRADO" ? <Square size={26} /> : <Radio size={26} />}
              </span>
              <h1>
                {estado.status === "ENCERRADO"
                  ? "Show encerrado."
                  : "O palco está pronto."}
              </h1>
              <p>
                {estado.status === "ENCERRADO"
                  ? `Foram ${setlist.length} músicas no setlist. Você pode iniciar uma nova passagem quando quiser.`
                  : isLider
                    ? "Inicie o show para compartilhar a música atual, as entradas e o contador com toda a banda."
                    : "Assim que o líder iniciar o show, a música atual, o contador e os avisos de entrada aparecerão aqui automaticamente."}
              </p>
              {isLider ? (
                <Button
                  icon={<Play size={17} />}
                  onClick={() =>
                    controlar.mutate({
                      acao: estado.status === "ENCERRADO" ? "REINICIAR" : "INICIAR"
                    })
                  }
                  loading={controlar.isPending}
                >
                  {estado.status === "ENCERRADO" ? "Abrir o palco novamente" : "Iniciar show"}
                </Button>
              ) : (
                <span className="live-standby__waiting">
                  <span className="live-dot" /> Aguardando o líder
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="live-now__title-row">
                <div className="live-now__title">
                  <h1>{atual.musica}</h1>
                  <span>{atual.artista || "Artista não informado"}</span>
                </div>
                <span className="live-tom">{atual.tom ?? "—"}</span>
              </div>

              <div className="live-now__meta">
                <span>
                  <Clock size={16} /> {formatDuration(atual.duracaoSegundos)}
                </span>
                <span>
                  <Music2 size={16} /> {atual.musicos.length} músicos
                </span>
                <span>
                  <Users size={16} /> {estado.nomeBanda}
                </span>
                {atual.observacao ? <span>{atual.observacao}</span> : null}
              </div>

              <div className={`live-timer ${restanteMusica === 0 && atual.duracaoSegundos ? "is-over" : ""}`}>
                <div className="live-timer__row">
                  <span>
                    <Clock size={14} /> Tempo da música
                  </span>
                  <strong>
                    {formatClock(decorridoMusica)}
                    {atual.duracaoSegundos
                      ? ` / ${formatClock(atual.duracaoSegundos)}`
                      : ""}
                  </strong>
                </div>
                <div className="live-timer__bar">
                  <span style={{ width: `${progressoMusica}%` }} />
                </div>
                <div className="live-timer__row live-timer__row--muted">
                  <span>
                    {restanteMusica === 0 && atual.duracaoSegundos
                      ? "Tempo esgotado"
                      : restanteMusica !== null
                        ? `Faltam ${formatClock(restanteMusica)}`
                        : "Duração não cadastrada"}
                  </span>
                  <span>{progressoMusica}%</span>
                </div>
              </div>

              <div className="live-entries">
                <span className="live-entries__label">Entradas desta música</span>
                {atual.musicos.length === 0 ? (
                  <p className="muted">
                    O líder ainda não definiu os músicos desta música no repertório.
                  </p>
                ) : (
                  <div className="live-entry-grid">
                    {atual.musicos.map((item) => {
                      const musico = musicosMap.get(item.idMusico);
                      const eu = item.idMusico === user?.idMusico;

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
                          {!eu ? (
                            <button
                              type="button"
                              className="live-entry__cutucar"
                              onClick={() => abrirCutucar(item.idMusico)}
                              aria-label={`Cutucar ${musico?.nome ?? "músico"}`}
                              title="Enviar uma cutucada"
                            >
                              <Hand size={14} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {isLider ? (
                <div className="live-controls">
                  <button
                    type="button"
                    className="live-control"
                    onClick={() => controlar.mutate({ acao: "ANTERIOR" })}
                    disabled={controlar.isPending || indiceAtual <= 0}
                  >
                    <ChevronLeft size={22} />
                    <span>Anterior</span>
                  </button>

                  <button
                    type="button"
                    className="live-control live-control--main"
                    onClick={() =>
                      controlar.mutate({
                        acao:
                          indiceAtual >= setlist.length - 1 ? "ENCERRAR" : "PROXIMA"
                      })
                    }
                    disabled={controlar.isPending}
                  >
                    {indiceAtual >= setlist.length - 1 ? (
                      <Square size={20} />
                    ) : (
                      <Check size={22} />
                    )}
                    <span>
                      {indiceAtual >= setlist.length - 1
                        ? "Encerrar show"
                        : "Concluir e avançar"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="live-control"
                    onClick={() => controlar.mutate({ acao: "PROXIMA" })}
                    disabled={controlar.isPending || indiceAtual >= setlist.length - 1}
                  >
                    <ChevronRight size={22} />
                    <span>Próxima</span>
                  </button>
                </div>
              ) : (
                <div className="live-viewer-note">
                  <Users size={16} />
                  O líder controla o andamento. Sua tela acompanha em tempo real.
                </div>
              )}

              <section className="live-lyrics">
                <header className="live-lyrics__head">
                  <div>
                    <span className="live-entries__label">Letra da música</span>
                    <strong>
                      {atual.artista || "Artista não informado"} · {atual.musica}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="live-lyrics__toggle"
                    onClick={() => setMostrarLetra((valor) => !valor)}
                  >
                    {mostrarLetra ? "Ocultar" : "Mostrar letra"}
                  </button>
                </header>

                {mostrarLetra ? (
                  <div className="live-lyrics__body">
                    {letraQuery.isLoading ? (
                      <div className="live-lyrics__loading">
                        <RefreshCw size={16} className="btn__spinner" />
                        Buscando letra...
                      </div>
                    ) : letraQuery.isError ? (
                      <div className="live-lyrics__error">
                        <p>{mensagemDeErro(letraQuery.error)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<RefreshCw size={14} />}
                          onClick={() => void letraQuery.refetch()}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    ) : (
                      <pre className="live-lyrics__text">{letraQuery.data?.lyrics}</pre>
                    )}
                  </div>
                ) : null}

                <span className="live-lyrics__source">
                  Letra via lyrics.ovh (API gratuita) ·{" "}
                  {atual.artista
                    ? "busca por artista e título"
                    : "cadastre o artista para melhorar a busca"}
                </span>
              </section>
            </>
          )}
        </section>

        <aside className="live-side">
          <div className="live-next-card">
            <span className="live-next-card__label">A seguir</span>
            {proxima ? (
              <>
                <strong>{proxima.musica}</strong>
                <span>
                  {proxima.artista ? `${proxima.artista} · ` : ""}
                  {proxima.tom ?? "—"} · {formatDuration(proxima.duracaoSegundos)}
                </span>
              </>
            ) : (
              <span>
                {estado.status === "RODANDO"
                  ? "Última música do setlist."
                  : "O setlist começa na primeira música."}
              </span>
            )}
          </div>

          <div className="live-progress">
            <div className="live-progress__head">
              <span>Progresso do show</span>
              <strong>{percentualShow}%</strong>
            </div>
            <div className="live-progress__bar">
              <span style={{ width: `${percentualShow}%` }} />
            </div>
            <span className="live-progress__time">
              {tocadasConcluidas} de {setlist.length} tocadas ·{" "}
              {formatTotalDuration(tocadasSegundos)} ·{" "}
              {formatTotalDuration(Math.max(totalSegundos - tocadasSegundos, 0))} no restante
            </span>
          </div>

          <div className="live-setlist">
            <div className="live-setlist__head">
              <span>Setlist</span>
              <ListMusic size={16} />
            </div>
            <ol>
              {setlist.map((musica, index) => {
                const isCurrent = index === indiceAtual;
                const isPlayed = index < indiceAtual;

                return (
                  <li key={musica.idRepertorio}>
                    <button
                      type="button"
                      className={`live-song ${isCurrent ? "is-current" : ""} ${isPlayed ? "is-played" : ""}`}
                      onClick={() => {
                        if (!isLider || isCurrent) return;
                        controlar.mutate({
                          acao: "SELECIONAR",
                          idRepertorio: musica.idRepertorio
                        });
                      }}
                      disabled={!isLider || isCurrent || controlar.isPending}
                      title={isLider ? "Colocar esta música no palco" : "Somente o líder controla"}
                    >
                      <span className="live-song__index">
                        {isPlayed ? <Check size={14} /> : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="live-song__body">
                        <strong>{musica.musica}</strong>
                        <span>
                          {musica.artista ? `${musica.artista} · ` : ""}
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

          <div className="live-alerts">
            <header className="live-alerts__head">
              <div>
                <span className="live-entries__label">Avisos do palco</span>
                <strong>
                  {notificacoesEvento.length === 0
                    ? "Tudo tranquilo"
                    : `${notificacoesEvento.filter((item) => !item.lida).length} não lidos`}
                </strong>
              </div>
              <button
                type="button"
                className="live-alerts__button"
                onClick={() => abrirCutucar()}
              >
                <Hand size={14} /> Cutucar
              </button>
            </header>

            {notificacoesEvento.length === 0 ? (
              <p className="live-alerts__empty">
                As notificações de entrada e as cutucadas deste evento aparecem aqui.
              </p>
            ) : (
              <ul className="live-alerts__list">
                {notificacoesEvento.slice(0, 5).map((notificacao) => (
                  <li
                    key={notificacao.idNotificacao}
                    className={notificacao.lida ? "" : "is-unread"}
                  >
                    <span className={`live-alert-icon live-alert-icon--${notificacao.tipo.toLowerCase()}`}>
                      {iconeAlerta(notificacao.tipo)}
                    </span>
                    <div>
                      <strong>{notificacao.titulo}</strong>
                      <span>{notificacao.mensagem}</span>
                      <small>{formatRelativeTime(notificacao.criadoEm)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="live-note">
            <Info size={15} />
            <p>
              O líder controla o palco; todos os participantes recebem a música atual, o
              contador e os avisos de entrada em tempo real. A letra é buscada em uma API
              pública e pode não estar disponível para todas as músicas.
            </p>
          </div>
        </aside>
      </main>

      {cutucar.open ? (
        <CutucarModal
          membros={membros}
          idMusicoAtual={user?.idMusico ?? 0}
          isLider={isLider}
          alvoInicial={cutucar.alvo}
          musicaAtual={atual?.musica ?? proxima?.musica ?? "a próxima música"}
          enviando={cutucarMutation.isPending}
          onClose={() => setCutucar({ open: false })}
          onEnviar={(alvo, mensagem) =>
            cutucarMutation.mutate({ alvo, mensagem })
          }
        />
      ) : null}
    </div>
  );
}

function LiveHeader({
  idEvento,
  nome,
  banda,
  status,
  isLider,
  onFullscreen,
  onCutucar
}: {
  idEvento: number;
  nome: string;
  banda: string;
  status: EstadoAoVivo["status"];
  isLider: boolean;
  onFullscreen?: () => void;
  onCutucar?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <header className="live-topbar">
      <div className="live-topbar__left">
        <button
          type="button"
          className="icon-button"
          onClick={() => navigate(`/eventos/${idEvento}`)}
          aria-label="Sair do modo ao vivo"
        >
          <ArrowLeft size={19} />
        </button>
        <Logo variant="light" />
        <span className="live-topbar__divider" />
        <div className="live-topbar__event">
          <strong>{nome}</strong>
          <span>{banda}</span>
        </div>
      </div>

      <div className="live-topbar__right">
        <Badge tone={status === "RODANDO" ? "purple" : "neutral"} dot={status === "RODANDO"}>
          <Radio size={12} />{" "}
          {status === "RODANDO" ? "Ao vivo" : status === "ENCERRADO" ? "Encerrado" : "Standby"}
        </Badge>
        {isLider ? <Badge tone="yellow">Você controla</Badge> : null}
        {onCutucar ? (
          <button
            type="button"
            className="icon-button"
            onClick={onCutucar}
            aria-label="Cutucar um músico"
            title="Cutucar um músico"
          >
            <Hand size={18} />
          </button>
        ) : null}
        {onFullscreen ? (
          <button
            type="button"
            className="icon-button"
            onClick={onFullscreen}
            aria-label="Tela cheia"
          >
            <Maximize size={18} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

function CutucarModal({
  membros,
  idMusicoAtual,
  isLider,
  alvoInicial,
  musicaAtual,
  enviando,
  onClose,
  onEnviar
}: {
  membros: Musico[];
  idMusicoAtual: number;
  isLider: boolean;
  alvoInicial?: number;
  musicaAtual: string;
  enviando: boolean;
  onClose: () => void;
  onEnviar: (alvo: string, mensagem: string) => void;
}) {
  const disponiveis = membros.filter((musico) => musico.idMusico !== idMusicoAtual);
  const [alvo, setAlvo] = useState(
    alvoInicial ? String(alvoInicial) : isLider ? "todos" : disponiveis[0] ? String(disponiveis[0].idMusico) : ""
  );
  const [mensagem, setMensagem] = useState(
    `Prepare-se para entrar em "${musicaAtual}"!`
  );
  const [erro, setErro] = useState<string | null>(null);

  function enviar() {
    setErro(null);

    if (!alvo) {
      setErro("Selecione um destinatário");
      return;
    }

    if (mensagem.trim().length < 2) {
      setErro("Escreva uma mensagem");
      return;
    }

    onEnviar(alvo, mensagem);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Cutucar um músico"
      description="A pessoa recebe um aviso em tempo real, mesmo que esteja em outra tela."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            loading={enviando}
            onClick={enviar}
            icon={<Send size={15} />}
          >
            Enviar alerta
          </Button>
        </>
      }
    >
      <div className="stack">
        {erro ? (
          <div className="alert alert--error" role="alert">
            {erro}
          </div>
        ) : null}

        <Field label="Para" htmlFor="cutucar-alvo" required>
          <Select
            id="cutucar-alvo"
            data-autofocus
            value={alvo}
            onChange={(event) => setAlvo(event.target.value)}
          >
            {isLider ? <option value="todos">Toda a banda</option> : null}
            {disponiveis.map((musico) => (
              <option key={musico.idMusico} value={String(musico.idMusico)}>
                {musico.nome} · {musico.cargo}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Mensagem"
          htmlFor="cutucar-mensagem"
          hint={`${mensagem.length}/200 caracteres`}
        >
          <Textarea
            id="cutucar-mensagem"
            rows={3}
            maxLength={200}
            value={mensagem}
            onChange={(event) => setMensagem(event.target.value)}
          />
        </Field>

        {disponiveis.length === 0 ? (
          <div className="inline-note">
            Ainda não há outro músico na banda para receber uma cutucada.
          </div>
        ) : null}
      </div>
    </Modal>
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
            Abra o setlist de um evento para acompanhar a música atual, o contador, as
            entradas e os avisos. O líder controla o andamento para toda a banda.
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
