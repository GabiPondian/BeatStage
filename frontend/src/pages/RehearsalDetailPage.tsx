import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock,
  MapPin,
  Mic2,
  Music2,
  Pencil,
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
import { MapEmbed } from "../components/ui/MapEmbed";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useBandas, useEnsaios, useMusicos, queryKeys } from "../hooks/queries";
import { ensaiosService } from "../services/ensaios.service";
import { daysUntil, formatDateLong, isPastDate } from "../lib/format";
import { canManageBand } from "../lib/permissions";
import { mensagemDeErro } from "../lib/api";
import { RehearsalFormModal } from "./RehearsalsPage";

export function RehearsalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const idEnsaio = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const ensaiosQuery = useEnsaios();
  const bandasQuery = useBandas();
  const musicosQuery = useMusicos();

  const [editOpen, setEditOpen] = useState(false);

  const ensaio = ensaiosQuery.data?.find((item) => item.idEnsaio === idEnsaio);
  const bandas = bandasQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];

  const banda = bandas.find((item) => item.idBanda === ensaio?.idBanda);
  const isLider = Boolean(
    ensaio && user && canManageBand(bandas, ensaio.idBanda, user.idMusico)
  );

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const membrosBanda = useMemo(() => {
    if (!banda) return [];
    return Array.from(new Set([banda.idLider, ...banda.idMembros]));
  }, [banda]);

  const deleteMutation = useMutation({
    mutationFn: () => ensaiosService.excluir(idEnsaio),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ensaios });
      toast.success("Ensaio excluído", "O encontro saiu da agenda da banda.");
      navigate("/ensaios", { replace: true });
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  if (ensaiosQuery.isLoading) {
    return (
      <div className="stack">
        <Skeleton className="skeleton--line skeleton--w30" />
        <Skeleton className="skeleton--block" />
      </div>
    );
  }

  if (ensaiosQuery.isError) {
    return (
      <ErrorState error={ensaiosQuery.error} onRetry={() => void ensaiosQuery.refetch()} />
    );
  }

  if (!ensaio) {
    return (
      <EmptyState
        icon={Mic2}
        title="Ensaio não encontrado"
        description="Ele pode ter sido excluído ou você não participa mais da banda."
        action={
          <Link to="/ensaios" className="btn btn--primary btn--md">
            Voltar para ensaios
          </Link>
        }
      />
    );
  }

  const realizado = isPastDate(ensaio.data);
  const diff = daysUntil(ensaio.data);
  const situacao = realizado ? "Realizado" : diff === 0 ? "É hoje" : `Em ${diff} dias`;
  const dataCompleta = formatDateLong(ensaio.data);

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir ensaio?",
      message: `O ensaio de ${dataCompleta} será removido da banda.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate();
  }

  return (
    <div className="stack stack--lg">
      <PageHeader
        backTo="/ensaios"
        backLabel="Ensaios"
        eyebrow={realizado ? "Encontro realizado" : "Próximo encontro"}
        title={ensaio.descricao?.trim() || "Ensaio da banda"}
        subtitle={banda?.nome ?? "Banda"}
        actions={
          isLider ? (
            <>
              <Button
                variant="outline"
                icon={<Pencil size={15} />}
                onClick={() => setEditOpen(true)}
              >
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
          ) : undefined
        }
      />

      <section className="event-detail-hero">
        <DateBadge date={ensaio.data} variant="light" size="lg" />
        <div className="event-detail-hero__body">
          <div className="event-detail-hero__badges">
            <Badge tone={realizado ? "neutral" : diff === 0 ? "yellow" : "purple"}>
              {situacao}
            </Badge>
            {banda ? <Badge tone="purple">{banda.nome}</Badge> : null}
          </div>
          <h2>{dataCompleta}</h2>
          <div className="event-detail-hero__meta">
            <span>
              <MapPin size={15} />
              {ensaio.local || "Local a definir"}
            </span>
            <span>
              <Mic2 size={15} />
              {banda?.nome ?? "Banda"}
            </span>
            <span>
              <Users size={15} />
              {membrosBanda.length} {membrosBanda.length === 1 ? "integrante" : "integrantes"}
            </span>
            <span>
              <Clock size={15} />
              {realizado ? "Já aconteceu" : "Confirmado"}
            </span>
          </div>
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
        <section className="stack">
          <section className="card">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Pauta</span>
                <h2>O que será trabalhado</h2>
              </div>
            </header>
            {ensaio.descricao ? (
              <p className="rehearsal-agenda">{ensaio.descricao}</p>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma pauta registrada"
                description={
                  isLider
                    ? "Edite o ensaio para deixar combinado o que a banda vai trabalhar."
                    : "O líder ainda não registrou a pauta deste encontro."
                }
                compact
              />
            )}
          </section>

          <section className="card">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Detalhes</span>
                <h2>Informações do encontro</h2>
              </div>
            </header>
            <ul className="detail-list">
              <li>
                <CalendarDays size={16} />
                <div>
                  <span>Data</span>
                  <strong>{dataCompleta}</strong>
                </div>
              </li>
              <li>
                <MapPin size={16} />
                <div>
                  <span>Local</span>
                  <strong>{ensaio.local || "Local a definir"}</strong>
                </div>
              </li>
              <li>
                <Mic2 size={16} />
                <div>
                  <span>Banda</span>
                  <strong>{banda?.nome ?? "Banda"}</strong>
                </div>
              </li>
              <li>
                <Clock size={16} />
                <div>
                  <span>Situação</span>
                  <strong>{situacao}</strong>
                </div>
              </li>
            </ul>
          </section>
        </section>

        <aside className="stack">
          <section className="card">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Onde</span>
                <h2>Localização</h2>
              </div>
            </header>
            <MapEmbed address={ensaio.local ?? ""} title={`Mapa — ${ensaio.local ?? "local"}`} />
          </section>

          {banda ? (
            <section className="card">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Banda</span>
                  <h2>{banda.nome}</h2>
                </div>
                <Link to={`/bandas/${banda.idBanda}`} className="panel-head__link">
                  Abrir banda <ArrowRight size={14} />
                </Link>
              </header>
              <p className="muted small">
                {banda.idMembros.length + 1} integrantes · líder{" "}
                {musicosMap.get(banda.idLider)?.nome ?? "—"}
              </p>
              <div className="avatar-row">
                {membrosBanda.map((idMusico) => {
                  const musico = musicosMap.get(idMusico);
                  return (
                    <Avatar
                      key={idMusico}
                      name={musico?.nome ?? `Músico ${idMusico}`}
                      src={musico?.fotoPerfil}
                      size="sm"
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="card">
            <span className="event-live-card__icon">
              <Music2 size={22} />
            </span>
            <h2>Repertório afiado?</h2>
            <p>
              Revise as músicas antes do encontro e deixe o setlist pronto para a próxima
              apresentação.
            </p>
            <Link to="/repertorio" className="btn btn--primary btn--md">
              <span>Abrir repertório</span>
            </Link>
          </section>
        </aside>
      </div>

      {editOpen ? (
        <RehearsalFormModal
          mode="edit"
          ensaio={ensaio}
          bandas={bandas}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void queryClient.invalidateQueries({ queryKey: queryKeys.ensaios });
          }}
        />
      ) : null}
    </div>
  );
}
