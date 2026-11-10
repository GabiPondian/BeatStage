import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Guitar,
  ListMusic,
  MessageSquareQuote,
  Mic2,
  Music2,
  Plus,
  Sparkles,
  Users
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  useAgendas,
  useBandas,
  useEnsaios,
  useEventos,
  useFeedbacks,
  useMusicos,
  useRepertorios
} from "../hooks/queries";
import { Badge } from "../components/ui/Badge";
import { DateBadge } from "../components/ui/DateBadge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { StatCard } from "../components/ui/StatCard";
import { Skeleton } from "../components/ui/Skeleton";
import {
  daysUntil,
  firstName,
  formatDateLong,
  formatDateShort,
  isPastDate,
  pluralize,
  relativeDay,
  sortByDateAndTime,
  toDateOnly
} from "../lib/format";
import { bandRole } from "../lib/permissions";
import type { Banda } from "../types/api";

type CommitmentKind = "evento" | "ensaio" | "agenda";

interface Commitment {
  key: string;
  kind: CommitmentKind;
  title: string;
  date: string;
  horario: string | null;
  local: string | null;
  bandId: number | null;
  to: string;
}

const KIND_LABEL: Record<CommitmentKind, string> = {
  evento: "Evento",
  ensaio: "Ensaio",
  agenda: "Agenda"
};

function StatSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card stat-card">
          <Skeleton className="skeleton--avatar" />
          <div className="skeleton-lines">
            <Skeleton className="skeleton--line skeleton--w40" />
            <Skeleton className="skeleton--line skeleton--w20" />
          </div>
        </div>
      ))}
    </>
  );
}

function BandMiniCard({
  banda,
  idMusico,
  musicosMap
}: {
  banda: Banda;
  idMusico: number;
  musicosMap: Map<number, { nome: string; fotoPerfil: string | null }>;
}) {
  const membros = [banda.idLider, ...banda.idMembros.filter((id) => id !== banda.idLider)];

  return (
    <Link to={`/bandas/${banda.idBanda}`} className="band-mini">
      <span className="band-mini__art" aria-hidden="true">
        <Music2 size={20} />
      </span>
      <span className="band-mini__body">
        <strong>{banda.nome}</strong>
        <span>
          {bandRole(banda, idMusico) === "lider" ? "Você é líder" : "Você é integrante"} ·{" "}
          {membros.length} {pluralize(membros.length, "músico", "músicos")}
        </span>
      </span>
      <span className="band-mini__avatars" aria-hidden="true">
        {membros.slice(0, 3).map((id) => {
          const musico = musicosMap.get(id);
          return (
            <Avatar
              key={id}
              name={musico?.nome ?? `Músico ${id}`}
              src={musico?.fotoPerfil}
              size="xs"
              className="mini-avatar"
            />
          );
        })}
      </span>
      <ArrowRight size={16} />
    </Link>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const bandasQuery = useBandas();
  const eventosQuery = useEventos();
  const ensaiosQuery = useEnsaios();
  const agendasQuery = useAgendas();
  const repertoriosQuery = useRepertorios();
  const feedbacksQuery = useFeedbacks();
  const musicosQuery = useMusicos();

  const loading =
    bandasQuery.isLoading ||
    eventosQuery.isLoading ||
    ensaiosQuery.isLoading ||
    agendasQuery.isLoading ||
    repertoriosQuery.isLoading ||
    feedbacksQuery.isLoading;

  const error =
    bandasQuery.error ??
    eventosQuery.error ??
    ensaiosQuery.error ??
    agendasQuery.error ??
    repertoriosQuery.error ??
    feedbacksQuery.error;

  const bandas = bandasQuery.data ?? [];
  const eventos = eventosQuery.data ?? [];
  const ensaios = ensaiosQuery.data ?? [];
  const agendas = agendasQuery.data ?? [];
  const repertorios = repertoriosQuery.data ?? [];
  const feedbacks = feedbacksQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda.nome])),
    [bandas]
  );

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const rede = useMemo(() => {
    const ids = new Set(
      bandas.flatMap((banda) => [banda.idLider, ...banda.idMembros])
    );
    return musicos.filter((musico) => ids.has(musico.idMusico));
  }, [bandas, musicos]);

  const commitments = useMemo<Commitment[]>(() => {
    const items: Commitment[] = [];

    for (const evento of eventos) {
      items.push({
        key: `evento-${evento.idEvento}`,
        kind: "evento",
        title: evento.nome,
        date: evento.data,
        horario: null,
        local: evento.local,
        bandId: evento.idBanda,
        to: `/eventos/${evento.idEvento}`
      });
    }

    for (const ensaio of ensaios) {
      items.push({
        key: `ensaio-${ensaio.idEnsaio}`,
        kind: "ensaio",
        title: ensaio.descricao?.trim() || "Ensaio da banda",
        date: ensaio.data,
        horario: null,
        local: ensaio.local,
        bandId: ensaio.idBanda,
        to: "/ensaios"
      });
    }

    for (const agenda of agendas) {
      if (agenda.concluido) continue;
      items.push({
        key: `agenda-${agenda.idAgenda}`,
        kind: "agenda",
        title: agenda.titulo,
        date: agenda.data,
        horario: agenda.horario,
        local: null,
        bandId: agenda.idBanda,
        to: "/agenda"
      });
    }

    return sortByDateAndTime(items).filter((item) => item.date && !isPastDate(item.date));
  }, [eventos, ensaios, agendas]);

  const proximos = commitments.slice(0, 5);
  const next = commitments[0];
  const proximosEventos = eventos.filter((evento) => !isPastDate(evento.data)).length;
  const ensaiosFuturos = ensaios.filter((ensaio) => !isPastDate(ensaio.data)).length;
  const createdDate = useMemo(() => formatDateLong(toDateOnly(new Date())), []);

  if (error) {
    return (
      <div className="stack">
        <ErrorState
          error={error}
          onRetry={() => {
            void bandasQuery.refetch();
            void eventosQuery.refetch();
            void ensaiosQuery.refetch();
            void agendasQuery.refetch();
            void repertoriosQuery.refetch();
            void feedbacksQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="stack stack--lg">
      <section className="dashboard-hero">
        <div className="dashboard-hero__copy">
          <span className="eyebrow">Painel do músico · {createdDate}</span>
          <h1>
            Olá, {firstName(user?.nome ?? "músico")}.{" "}
            <span>O pulso da banda.</span>
          </h1>
          <p>
            {bandas.length > 0
              ? `Você participa de ${bandas.length} ${pluralize(bandas.length, "banda", "bandas")}. Aqui está o que acontece no seu palco agora.`
              : "Sua banda começa aqui. Crie uma banda ou entre com um código de convite para começar."}
          </p>
          <div className="dashboard-hero__actions">
            <Link to="/bandas" className="btn btn--primary btn--md">
              <Users size={16} />
              <span>Minhas bandas</span>
            </Link>
            <Link to="/agenda" className="btn btn--outline btn--md">
              <CalendarDays size={16} />
              <span>Ver agenda</span>
            </Link>
          </div>
        </div>
        <div className="dashboard-hero__avatar" aria-hidden="true">
          <Avatar name={user?.nome ?? "Músico"} src={user?.fotoPerfil} size="xl" />
          <span className="dashboard-hero__pulse" />
        </div>
      </section>

      {loading ? (
        <div className="card">
          <Skeleton className="skeleton--line skeleton--w30" />
          <Skeleton className="skeleton--line skeleton--w60" />
        </div>
      ) : next ? (
        <section className="next-card">
          <div className="next-card__date">
            <DateBadge date={next.date} variant="light" size="lg" />
            <span className="next-card__countdown">{relativeDay(next.date)}</span>
          </div>
          <div className="next-card__body">
            <div className="next-card__badges">
              <Badge tone="yellow">{KIND_LABEL[next.kind]}</Badge>
              {daysUntil(next.date) <= 3 ? (
                <Badge tone="purple" dot>
                  Chegando
                </Badge>
              ) : null}
            </div>
            <h2>{next.title}</h2>
            <p>
              {next.bandId ? bandaMap.get(next.bandId) : "Compromisso individual"}
              {next.horario ? ` · ${next.horario}` : ""}
              {next.local ? ` · ${next.local}` : ""}
            </p>
          </div>
          <div className="next-card__actions">
            <Link to={next.to} className="btn btn--primary btn--md">
              <span>Ver detalhes</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/agenda" className="next-card__link">
              Abrir agenda
            </Link>
          </div>
        </section>
      ) : (
        <EmptyState
          icon={CalendarPlus}
          title="Nenhum compromisso à frente"
          description="Quando você cadastrar um ensaio, evento ou atividade na agenda, ele aparece aqui."
          action={
            <Link to="/agenda" className="btn btn--primary btn--md">
              <Plus size={16} />
              <span>Criar atividade</span>
            </Link>
          }
        />
      )}

      <section className="stat-grid">
        {loading ? (
          <StatSkeleton />
        ) : (
          <>
            <StatCard
              icon={ListMusic}
              label="Músicas no repertório"
              value={repertorios.length}
              hint={`${repertorios.filter((item) => item.tom).length} com tom definido`}
              tone="purple"
              to="/repertorio"
            />
            <StatCard
              icon={Guitar}
              label="Próximos eventos"
              value={proximosEventos}
              hint={`${eventos.length} no total`}
              tone="yellow"
              to="/eventos"
            />
            <StatCard
              icon={Mic2}
              label="Ensaios agendados"
              value={ensaiosFuturos}
              hint="Próximos encontros da banda"
              tone="green"
              to="/ensaios"
            />
          </>
        )}
      </section>

      <div className="dashboard-grid">
        <section className="card dashboard-panel">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Sua agenda</span>
              <h2>Próximos compromissos</h2>
            </div>
            <Link to="/agenda" className="panel-head__link">
              Ver tudo <ArrowRight size={14} />
            </Link>
          </header>

          {loading ? (
            <div className="stack">
              <Skeleton className="skeleton--line skeleton--w70" />
              <Skeleton className="skeleton--line skeleton--w55" />
              <Skeleton className="skeleton--line skeleton--w65" />
            </div>
          ) : proximos.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Agenda livre por enquanto"
              description="Cadastre um ensaio ou atividade para não perder nenhum encontro."
              compact
            />
          ) : (
            <ul className="commitment-list">
              {proximos.map((item) => (
                <li key={item.key}>
                  <Link className="commitment" to={item.to}>
                    <DateBadge date={item.date} size="sm" />
                    <span className="commitment__body">
                      <strong>{item.title}</strong>
                      <span>
                        {item.bandId ? bandaMap.get(item.bandId) : "Individual"}
                        {item.horario ? ` · ${item.horario}` : ""}
                        {item.local ? ` · ${item.local}` : ""}
                      </span>
                    </span>
                    <Badge tone={item.kind === "evento" ? "yellow" : item.kind === "ensaio" ? "purple" : "neutral"}>
                      {KIND_LABEL[item.kind]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card dashboard-panel">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Seu coletivo</span>
              <h2>Minhas bandas</h2>
            </div>
            <Link to="/bandas" className="panel-head__link">
              Gerenciar <ArrowRight size={14} />
            </Link>
          </header>

          {loading ? (
            <div className="stack">
              <Skeleton className="skeleton--line skeleton--w80" />
              <Skeleton className="skeleton--line skeleton--w65" />
            </div>
          ) : bandas.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Você ainda não tem bandas"
              description="Crie a sua banda ou use um código de convite para entrar em uma."
              compact
              action={
                <Link to="/bandas" className="btn btn--outline btn--sm">
                  <Plus size={14} />
                  <span>Criar ou entrar</span>
                </Link>
              }
            />
          ) : (
            <div className="band-mini-list">
              {bandas.slice(0, 3).map((banda) => (
                <BandMiniCard
                  key={banda.idBanda}
                  banda={banda}
                  idMusico={user?.idMusico ?? 0}
                  musicosMap={musicosMap}
                />
              ))}
              {bandas.length > 3 ? (
                <Link to="/bandas" className="band-mini-list__more">
                  + {bandas.length - 3} outras bandas
                </Link>
              ) : null}
            </div>
          )}

          <div className="dashboard-panel__members">
            <span className="dashboard-panel__members-label">Músicos na sua rede</span>
            <div className="avatar-row">
              {rede.slice(0, 6).map((musico) => (
                <Avatar
                  key={musico.idMusico}
                  name={musico.nome}
                  src={musico.fotoPerfil}
                  size="sm"
                />
              ))}
              {rede.length === 0 ? (
                <span className="muted">Nenhum músico na sua rede ainda.</span>
              ) : null}
            </div>
          </div>

          {feedbacks.length > 0 ? (
            <div className="dashboard-feedback">
              <span className="dashboard-panel__members-label">Últimos comentários</span>
              <ul>
                {feedbacks.slice(0, 2).map((feedback) => {
                  const autor = feedback.idMusico
                    ? musicosMap.get(feedback.idMusico)
                    : undefined;
                  return (
                    <li key={feedback.idFeedback}>
                      <Avatar
                        name={feedback.anonimo ? "Anônimo" : autor?.nome ?? "Músico"}
                        src={feedback.anonimo ? null : autor?.fotoPerfil}
                        size="xs"
                      />
                      <div>
                        <strong>
                          {feedback.anonimo ? "Membro anônimo" : autor?.nome ?? "Músico"}
                        </strong>
                        <span>{feedback.comentario}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link to="/feedback" className="panel-head__link">
                Abrir mural <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <section className="feedback-banner">
        <div className="feedback-banner__icon">
          <MessageSquareQuote size={22} />
        </div>
        <div>
          <span className="eyebrow">Feedback da banda</span>
          <h2>Sua opinião molda o próximo show.</h2>
          <p>
            {feedbacks.length > 0
              ? `${feedbacks.length} ${pluralize(feedbacks.length, "comentário", "comentários")} já estão no mural da banda.`
              : "Compartilhe ideias, elogios e sugestões com a sua banda — de forma identificada ou anônima."}
          </p>
        </div>
        <Link to="/feedback" className="btn btn--primary btn--md">
          <ClipboardList size={16} />
          <span>Abrir feedback</span>
        </Link>
      </section>

      {loading ? null : (
        <footer className="dashboard-footer">
          <Sparkles size={14} />
          <span>
            Última atualização em {formatDateShort(toDateOnly(new Date()))} · dados reais da sua conta
          </span>
        </footer>
      )}
    </div>
  );
}
