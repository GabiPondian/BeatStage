import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Guitar,
  ListMusic,
  MapPin,
  Music2,
  Pencil,
  Plus,
  Radio,
  Speaker,
  Trash2
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { DateBadge } from "../components/ui/DateBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCards } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  useBandas,
  useEquipamentos,
  useEventos,
  useRepertorios,
  queryKeys
} from "../hooks/queries";
import { eventosService } from "../services/eventos.service";
import {
  daysUntil,
  formatDateShort,
  formatDuration,
  formatTotalDuration,
  isPastDate,
  parseDateOnly,
  toDateOnly
} from "../lib/format";
import { canManageBand, ledBands } from "../lib/permissions";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Banda, Equipamento, Evento, Repertorio } from "../types/api";

interface ModalState {
  mode: "create" | "edit";
  evento?: Evento;
}

function statusFor(data: string): { label: string; tone: "green" | "yellow" | "purple" | "neutral" } {
  if (isPastDate(data)) return { label: "Realizado", tone: "neutral" };
  const diff = daysUntil(data);
  if (diff === 0) return { label: "Hoje", tone: "yellow" };
  if (diff <= 7) return { label: "Próximo", tone: "purple" };
  return { label: "Agendado", tone: "green" };
}

export function EventsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const eventsQuery = useEventos();
  const bandsQuery = useBandas();
  const repertoriosQuery = useRepertorios();
  const equipamentosQuery = useEquipamentos();

  const [busca, setBusca] = useState("");
  const [bandaFilter, setBandaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"proximos" | "todos" | "realizados">("proximos");
  const [modal, setModal] = useState<ModalState | null>(null);

  const eventos = eventsQuery.data ?? [];
  const bandas = bandsQuery.data ?? [];
  const repertorios = repertoriosQuery.data ?? [];
  const equipamentos = equipamentosQuery.data ?? [];
  const lideradas = ledBands(bandas, user?.idMusico ?? 0);

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda])),
    [bandas]
  );

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return eventos.filter((evento) => {
      if (bandaFilter !== "all" && String(evento.idBanda) !== bandaFilter) return false;
      if (statusFilter === "proximos" && isPastDate(evento.data)) return false;
      if (statusFilter === "realizados" && !isPastDate(evento.data)) return false;
      if (term) {
        const haystack = `${evento.nome} ${evento.local ?? ""} ${evento.descricao ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [eventos, bandaFilter, statusFilter, busca]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => eventosService.excluir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
      toast.success("Evento excluído", "A apresentação saiu da agenda.");
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  async function handleDelete(evento: Evento) {
    const ok = await confirm({
      title: "Excluir evento?",
      message: `"${evento.nome}" será removido, junto com os vínculos de repertório e equipamentos.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate(evento.idEvento);
  }

  const error =
    eventsQuery.error ??
    bandsQuery.error ??
    repertoriosQuery.error ??
    equipamentosQuery.error;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Apresentações"
        title="Eventos"
        subtitle="Shows e apresentações com data, local, setlist e equipamentos definidos."
        actions={
          lideradas.length > 0 ? (
            <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
              Novo evento
            </Button>
          ) : undefined
        }
      />

      {lideradas.length === 0 && eventos.length > 0 ? (
        <div className="inline-note">
          Apenas o líder da banda pode criar, editar ou excluir eventos. Você pode consultar
          todos os detalhes e abrir o modo ao vivo.
        </div>
      ) : null}

      <div className="toolbar">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar evento, local..."
          ariaLabel="Buscar evento"
        />
        <div className="toolbar__filters">
          <Select
            value={bandaFilter}
            onChange={(event) => setBandaFilter(event.target.value)}
            aria-label="Filtrar por banda"
          >
            <option value="all">Todas as bandas</option>
            {bandas.map((banda) => (
              <option key={banda.idBanda} value={String(banda.idBanda)}>
                {banda.nome}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            aria-label="Filtrar por situação"
          >
            <option value="proximos">Próximos</option>
            <option value="todos">Todos</option>
            <option value="realizados">Realizados</option>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void eventsQuery.refetch();
            void bandsQuery.refetch();
            void repertoriosQuery.refetch();
            void equipamentosQuery.refetch();
          }}
        />
      ) : eventsQuery.isLoading ? (
        <SkeletonCards count={3} />
      ) : eventos.length === 0 ? (
        <EmptyState
          icon={Guitar}
          title="Nenhum show marcado"
          description={
            lideradas.length > 0
              ? "Cadastre o próximo evento da banda com local, repertório e equipamentos."
              : "Quando o líder cadastrar uma apresentação, ela aparece aqui."
          }
          action={
            lideradas.length > 0 ? (
              <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
                Novo evento
              </Button>
            ) : undefined
          }
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Guitar}
          title="Nenhum evento encontrado"
          description="Ajuste os filtros ou cadastre uma nova apresentação."
        />
      ) : (
        <div className="event-grid">
          {filtrados.map((evento) => {
            const banda = bandaMap.get(evento.idBanda);
            const status = statusFor(evento.data);
            const podeEditar = Boolean(
              user && canManageBand(bandas, evento.idBanda, user.idMusico)
            );
            const setlist = repertorios.filter((item) =>
              evento.idRepertorios.includes(item.idRepertorio)
            );
            const duracao = setlist.reduce(
              (total, item) => total + (item.duracaoSegundos ?? 0),
              0
            );

            return (
              <article key={evento.idEvento} className="event-card">
                <div className="event-card__head">
                  <DateBadge date={evento.data} variant="light" size="lg" />
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>

                <div className="event-card__body">
                  <span className="event-card__band">{banda?.nome ?? "Banda"}</span>
                  <h2>{evento.nome}</h2>
                  <div className="event-card__meta">
                    <span>
                      <MapPin size={14} />
                      {evento.local || "Local a definir"}
                    </span>
                    <span>
                      <CalendarDays size={14} />
                      {formatDateShort(evento.data)}
                    </span>
                  </div>
                  {evento.descricao ? <p>{evento.descricao}</p> : null}

                  <div className="event-card__counts">
                    <span>
                      <ListMusic size={14} />
                      {setlist.length} {setlist.length === 1 ? "música" : "músicas"}
                    </span>
                    <span>
                      <Speaker size={14} />
                      {evento.idEquipamentos.length} equip.
                    </span>
                    <span>
                      <Music2 size={14} />
                      {formatTotalDuration(duracao)}
                    </span>
                  </div>
                </div>

                <div className="event-card__footer">
                  <Link to={`/eventos/${evento.idEvento}`} className="btn btn--ghost btn--sm">
                    <span>Ver evento</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    to={`/ao-vivo/${evento.idEvento}`}
                    className="icon-button"
                    aria-label={`Abrir modo ao vivo de ${evento.nome}`}
                    title="Modo ao vivo"
                  >
                    <Radio size={16} />
                  </Link>
                  {podeEditar ? (
                    <>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setModal({ mode: "edit", evento })}
                        aria-label={`Editar ${evento.nome}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        onClick={() => void handleDelete(evento)}
                        aria-label={`Excluir ${evento.nome}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal ? (
        <EventFormModal
          key={`${modal.mode}-${modal.evento?.idEvento ?? "novo"}`}
          mode={modal.mode}
          evento={modal.evento}
          bandas={bandas}
          repertorios={repertorios}
          equipamentos={equipamentos}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
            void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
          }}
        />
      ) : null}
    </div>
  );
}

export function EventFormModal({
  mode,
  evento,
  bandas,
  repertorios,
  equipamentos,
  idMusico,
  onClose,
  onSaved
}: {
  mode: "create" | "edit";
  evento?: Evento;
  bandas: Banda[];
  repertorios: Repertorio[];
  equipamentos: Equipamento[];
  idMusico: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const lideradas = ledBands(bandas, idMusico);

  const [idBanda, setIdBanda] = useState(
    evento ? String(evento.idBanda) : lideradas[0] ? String(lideradas[0].idBanda) : ""
  );
  const [nome, setNome] = useState(evento?.nome ?? "");
  const [data, setData] = useState(
    evento ? toDateOnly(parseDateOnly(evento.data)) : toDateOnly(new Date())
  );
  const [local, setLocal] = useState(evento?.local ?? "");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [selecionadosRepertorios, setSelecionadosRepertorios] = useState<number[]>(
    evento?.idRepertorios ?? []
  );
  const [selecionadosEquipamentos, setSelecionadosEquipamentos] = useState<number[]>(
    evento?.idEquipamentos ?? []
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const bandaSelecionada = Number(idBanda);
  const repertoriosDaBanda = repertorios.filter(
    (item) => item.idBanda === bandaSelecionada
  );
  const equipamentosDaBanda = equipamentos.filter(
    (item) => item.idBanda === bandaSelecionada
  );

  function toggle(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!idBanda) nextErrors.idBanda = "Selecione a banda";
    if (nome.trim().length < 2) nextErrors.nome = "Informe o nome do evento";
    if (!data) nextErrors.data = "Informe a data";

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      if (mode === "create") {
        await eventosService.criar({
          idBanda: Number(idBanda),
          nome: nome.trim(),
          data,
          ...(local.trim() ? { local: local.trim() } : {}),
          ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
          idEquipamentos: selecionadosEquipamentos,
          idRepertorios: selecionadosRepertorios
        });
        toast.success("Evento criado", "A apresentação entrou na agenda da banda.");
      } else if (evento) {
        await eventosService.atualizar(evento.idEvento, {
          nome: nome.trim(),
          data,
          local: local.trim() || null,
          descricao: descricao.trim() || null,
          idEquipamentos: selecionadosEquipamentos,
          idRepertorios: selecionadosRepertorios
        });
        toast.success("Evento atualizado", "As alterações foram salvas.");
      }

      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          nome: error.fields.nome,
          data: error.fields.data,
          idBanda: error.fields.idBanda
        });
      }
      setFormError(mensagemDeErro(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={mode === "create" ? "Novo evento" : "Editar evento"}
      description="Reúna o setlist e os equipamentos necessários para a apresentação."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={() => void handleSubmit()} icon={<Check size={16} />}>
            {mode === "create" ? "Criar evento" : "Salvar alterações"}
          </Button>
        </>
      }
    >
      <div className="stack">
        {formError ? (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="form-grid form-grid--two">
          <Field label="Banda" htmlFor="evento-banda" error={errors.idBanda} required>
            <Select
              id="evento-banda"
              value={idBanda}
              disabled={mode === "edit"}
              invalid={Boolean(errors.idBanda)}
              onChange={(event) => {
                setIdBanda(event.target.value);
                setSelecionadosRepertorios([]);
                setSelecionadosEquipamentos([]);
              }}
            >
              {lideradas.map((banda) => (
                <option key={banda.idBanda} value={String(banda.idBanda)}>
                  {banda.nome}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Data" htmlFor="evento-data" error={errors.data} required>
            <Input
              id="evento-data"
              type="date"
              value={data}
              invalid={Boolean(errors.data)}
              onChange={(event) => setData(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Nome do evento" htmlFor="evento-nome" error={errors.nome} required>
          <Input
            id="evento-nome"
            data-autofocus
            value={nome}
            placeholder="Ex.: Festival de Inverno"
            invalid={Boolean(errors.nome)}
            onChange={(event) => setNome(event.target.value)}
          />
        </Field>

        <Field label="Local" htmlFor="evento-local">
          <Input
            id="evento-local"
            value={local}
            placeholder="Ex.: Arena BeatStage"
            onChange={(event) => setLocal(event.target.value)}
          />
        </Field>

        <Field label="Descrição" htmlFor="evento-descricao">
          <Textarea
            id="evento-descricao"
            rows={2}
            value={descricao}
            placeholder="Informações de produção, horários, observações..."
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>

        <div className="field">
          <span className="field__label">Setlist do evento</span>
          <p className="field__hint">
            Selecione as músicas que farão parte desta apresentação.
          </p>
          {repertoriosDaBanda.length === 0 ? (
            <div className="inline-note">Esta banda ainda não tem músicas no repertório.</div>
          ) : (
            <ul className="check-list">
              {repertoriosDaBanda.map((musica) => (
                <li key={musica.idRepertorio}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selecionadosRepertorios.includes(musica.idRepertorio)}
                      onChange={() =>
                        setSelecionadosRepertorios((current) =>
                          toggle(current, musica.idRepertorio)
                        )
                      }
                    />
                    <span className="check-row__body">
                      <strong>{musica.musica}</strong>
                      <span>
                        {musica.tom ?? "Tom livre"} · {formatDuration(musica.duracaoSegundos)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="field">
          <span className="field__label">Equipamentos necessários</span>
          <p className="field__hint">Selecione os itens que a banda levará para o evento.</p>
          {equipamentosDaBanda.length === 0 ? (
            <div className="inline-note">Nenhum equipamento cadastrado para esta banda.</div>
          ) : (
            <ul className="check-list check-list--grid">
              {equipamentosDaBanda.map((equipamento) => (
                <li key={equipamento.idEquipamento}>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={selecionadosEquipamentos.includes(equipamento.idEquipamento)}
                      onChange={() =>
                        setSelecionadosEquipamentos((current) =>
                          toggle(current, equipamento.idEquipamento)
                        )
                      }
                    />
                    <span className="check-row__body">
                      <strong>{equipamento.nome}</strong>
                      <span>
                        {equipamento.estado === "PROPRIO" ? "Próprio" : "Emprestado"}
                        {equipamento.responsavel ? ` · ${equipamento.responsavel}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

