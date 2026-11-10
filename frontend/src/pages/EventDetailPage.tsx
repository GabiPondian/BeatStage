import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Guitar,
  ListMusic,
  MapPin,
  Music2,
  Pencil,
  Radio,
  Speaker,
  Trash2,
  Users
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { DateBadge } from "../components/ui/DateBadge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  useBandas,
  useEquipamentos,
  useEventos,
  useMusicos,
  useRepertorios,
  queryKeys
} from "../hooks/queries";
import { eventosService } from "../services/eventos.service";
import {
  formatDateLong,
  formatDuration,
  formatTotalDuration,
  isPastDate
} from "../lib/format";
import { canManageBand } from "../lib/permissions";
import { mensagemDeErro } from "../lib/api";
import { EventFormModal } from "./EventsPage";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const idEvento = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const eventsQuery = useEventos();
  const bandsQuery = useBandas();
  const repertoriosQuery = useRepertorios();
  const equipamentosQuery = useEquipamentos();
  const musicosQuery = useMusicos();

  const [editOpen, setEditOpen] = useState(false);

  const evento = eventsQuery.data?.find((item) => item.idEvento === idEvento);
  const bandas = bandsQuery.data ?? [];
  const repertorios = repertoriosQuery.data ?? [];
  const equipamentos = equipamentosQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];

  const banda = bandas.find((item) => item.idBanda === evento?.idBanda);
  const isLider = Boolean(
    evento && user && canManageBand(bandas, evento.idBanda, user.idMusico)
  );

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const setlist = useMemo(() => {
    if (!evento) return [];
    return evento.idRepertorios
      .map((idRepertorio) =>
        repertorios.find((item) => item.idRepertorio === idRepertorio)
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [evento, repertorios]);

  const membrosBanda = useMemo(() => {
    if (!banda) return [];
    return Array.from(new Set([banda.idLider, ...banda.idMembros]));
  }, [banda]);

  const equipamentosEvento = useMemo(() => {
    if (!evento) return [];
    return evento.idEquipamentos
      .map((idEquipamento) =>
        equipamentos.find((item) => item.idEquipamento === idEquipamento)
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [evento, equipamentos]);

  const duracaoTotal = setlist.reduce(
    (total, item) => total + (item.duracaoSegundos ?? 0),
    0
  );

  const deleteMutation = useMutation({
    mutationFn: () => eventosService.excluir(idEvento),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
      toast.success("Evento excluído", "A apresentação saiu da agenda.");
      navigate("/eventos", { replace: true });
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  if (eventsQuery.isLoading) {
    return (
      <div className="stack">
        <Skeleton className="skeleton--line skeleton--w30" />
        <Skeleton className="skeleton--block" />
      </div>
    );
  }

  if (eventsQuery.isError) {
    return <ErrorState error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />;
  }

  if (!evento) {
    return (
      <EmptyState
        icon={Guitar}
        title="Evento não encontrado"
        description="Ele pode ter sido excluído ou você não participa mais da banda."
        action={
          <Link to="/eventos" className="btn btn--primary btn--md">
            Voltar para eventos
          </Link>
        }
      />
    );
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir evento?",
      message: `"${evento?.nome}" será removido, junto com seus vínculos de setlist e equipamentos.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate();
  }

  return (
    <div className="stack stack--lg">
      <PageHeader
        backTo="/eventos"
        backLabel="Eventos"
        eyebrow={isPastDate(evento.data) ? "Apresentação realizada" : "Próxima apresentação"}
        title={evento.nome}
        subtitle={banda?.nome ?? "Banda"}
        actions={
          <>
            <Link to={`/ao-vivo/${evento.idEvento}`} className="btn btn--purple btn--md">
              <Radio size={16} />
              <span>Modo ao vivo</span>
            </Link>
            {isLider ? (
              <>
                <Button variant="outline" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
                  Editar
                </Button>
                <Button
                  variant="danger-ghost"
                  icon={<Trash2 size={15} />}
                  onClick={() => void handleDelete()}
                  loading={deleteMutation.isPending}
                >
                  Excluir
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <section className="event-detail-hero">
        <DateBadge date={evento.data} variant="light" size="lg" />
        <div className="event-detail-hero__body">
          <div className="event-detail-hero__badges">
            <Badge tone={isPastDate(evento.data) ? "neutral" : "green"}>
              {isPastDate(evento.data) ? "Realizado" : "Agendado"}
            </Badge>
            <Badge tone="purple">{banda?.nome ?? "Banda"}</Badge>
          </div>
          <h2>{formatDateLong(evento.data)}</h2>
          <div className="event-detail-hero__meta">
            <span>
              <MapPin size={15} />
              {evento.local || "Local a definir"}
            </span>
            <span>
              <ListMusic size={15} />
              {setlist.length} {setlist.length === 1 ? "música" : "músicas"}
            </span>
            <span>
              <Clock size={15} />
              {formatTotalDuration(duracaoTotal)}
            </span>
            <span>
              <Users size={15} />
              {banda ? banda.idMembros.length + 1 : 0} integrantes
            </span>
          </div>
          {evento.descricao ? <p>{evento.descricao}</p> : null}
          {banda && membrosBanda.length > 0 ? (
            <div className="event-detail-hero__lineup">
              <span className="event-detail-hero__lineup-label">Formação</span>
              <div className="avatar-row">
                {membrosBanda.map((idMusico) => {
                  const musico = musicosMap.get(idMusico);
                  return (
                    <Avatar
                      key={idMusico}
                      name={musico?.nome ?? `Músico ${idMusico}`}
                      src={musico?.fotoPerfil}
                      size="xs"
                    />
                  );
                })}
              </div>
              <span>
                {membrosBanda.length} integrantes · líder{" "}
                {musicosMap.get(banda.idLider)?.nome ?? "—"}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <div className="event-detail-grid">
        <section className="card">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Setlist</span>
              <h2>Repertório do evento</h2>
            </div>
            <Link to="/repertorio" className="panel-head__link">
              Abrir repertório <ArrowRight size={14} />
            </Link>
          </header>

          {setlist.length === 0 ? (
            <EmptyState
              icon={ListMusic}
              title="Nenhuma música vinculada"
              description={
                isLider
                  ? "Edite o evento para escolher as músicas desta apresentação."
                  : "O líder ainda não definiu o setlist deste evento."
              }
              compact
            />
          ) : (
            <ol className="setlist">
              {setlist.map((musica, index) => (
                <li key={musica.idRepertorio} className="setlist__item">
                  <span className="setlist__index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="setlist__body">
                    <div className="setlist__title">
                      <strong>{musica.musica}</strong>
                      {musica.artista ? (
                        <span className="setlist__artist">{musica.artista}</span>
                      ) : null}
                      <Badge tone={musica.tom ? "yellow" : "neutral"}>
                        {musica.tom ?? "—"}
                      </Badge>
                      <span className="setlist__duration">
                        {formatDuration(musica.duracaoSegundos)}
                      </span>
                    </div>
                    {musica.musicos.length > 0 ? (
                      <div className="setlist__musicians">
                        {musica.musicos.map((item) => {
                          const musico = musicosMap.get(item.idMusico);
                          return (
                            <span key={item.idMusico} className="musician-tag">
                              <Avatar
                                name={musico?.nome ?? `Músico ${item.idMusico}`}
                                src={musico?.fotoPerfil}
                                size="xs"
                              />
                              {musico?.nome.split(" ")[0] ?? `#${item.idMusico}`}
                              {item.funcaoMusico ? ` · ${item.funcaoMusico}` : ""}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <aside className="stack">
          <section className="card">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Estrutura</span>
                <h2>Equipamentos</h2>
              </div>
            </header>
            {equipamentosEvento.length === 0 ? (
              <EmptyState
                icon={Speaker}
                title="Nenhum equipamento"
                description={
                  isLider
                    ? "Edite o evento para selecionar os equipamentos necessários."
                    : "O líder não vinculou equipamentos a este evento."
                }
                compact
              />
            ) : (
              <ul className="equipment-mini-list">
                {equipamentosEvento.map((equipamento) => (
                  <li key={equipamento.idEquipamento}>
                    <span className="equipment-mini-list__icon">
                      <Speaker size={16} />
                    </span>
                    <div>
                      <strong>{equipamento.nome}</strong>
                      <span>
                        {equipamento.estado === "PROPRIO" ? "Próprio" : "Emprestado"}
                        {equipamento.responsavel ? ` · ${equipamento.responsavel}` : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card event-live-card">
            <span className="event-live-card__icon">
              <Music2 size={22} />
            </span>
            <h2>Pronto para o palco?</h2>
            <p>
              Abra o modo ao vivo para acompanhar música atual, próxima música, tom e as
              entradas de cada músico.
            </p>
            <Link to={`/ao-vivo/${evento.idEvento}`} className="btn btn--primary btn--md">
              <Radio size={16} />
              <span>Abrir modo ao vivo</span>
            </Link>
          </section>

          <section className="card">
            <h2 className="card__title-sm">Agenda</h2>
            <p className="muted small">
              Para acompanhar a produção, crie uma atividade na agenda e vincule a este
              evento.
            </p>
            <Link to="/agenda" className="panel-head__link">
              <CalendarDays size={14} /> Ver agenda <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>

      {editOpen ? (
        <EventFormModal
          mode="edit"
          evento={evento}
          bandas={bandas}
          repertorios={repertorios}
          equipamentos={equipamentos}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
            void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
          }}
        />
      ) : null}
    </div>
  );
}
