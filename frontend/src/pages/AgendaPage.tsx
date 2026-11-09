import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  List,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Select, Field, Input, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { DateBadge } from "../components/ui/DateBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  useAgendas,
  useBandas,
  useEventos,
  queryKeys
} from "../hooks/queries";
import { agendasService } from "../services/agendas.service";
import {
  formatDateLong,
  formatMonthYear,
  isPastDate,
  parseDateOnly,
  sortByDateAndTime,
  toDateOnly
} from "../lib/format";
import { canManageBand, ledBands } from "../lib/permissions";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Agenda, Banda, Evento, TipoAgenda } from "../types/api";

type ViewMode = "lista" | "calendario";
type StatusFilter = "proximos" | "todos" | "concluidos";

interface ModalState {
  mode: "create" | "edit";
  agenda?: Agenda;
  initialDate?: string;
}

function canEditAgenda(agenda: Agenda, bandas: Banda[], idMusico: number): boolean {
  if (agenda.tipoAgenda === "BANDA") {
    return agenda.idBanda !== null && canManageBand(bandas, agenda.idBanda, idMusico);
  }

  return agenda.idMusico === idMusico;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function AgendaPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const agendasQuery = useAgendas();
  const bandasQuery = useBandas();
  const eventosQuery = useEventos();

  const agendas = agendasQuery.data ?? [];
  const bandas = bandasQuery.data ?? [];
  const eventos = eventosQuery.data ?? [];

  const [view, setView] = useState<ViewMode>("lista");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("proximos");
  const [bandaFilter, setBandaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState<"all" | TipoAgenda>("all");
  const [busca, setBusca] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [modal, setModal] = useState<ModalState | null>(null);
  const [detalhe, setDetalhe] = useState<Agenda | null>(null);

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda])),
    [bandas]
  );

  const toggleMutation = useMutation({
    mutationFn: (agenda: Agenda) =>
      agendasService.atualizar(agenda.idAgenda, { concluido: !agenda.concluido }),
    onSuccess: (_, agenda) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
      toast.success(
        agenda.concluido ? "Atividade reaberta" : "Atividade concluída",
        agenda.titulo
      );
    },
    onError: (error) => toast.error("Não foi possível atualizar", mensagemDeErro(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agendasService.excluir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
      toast.success("Atividade excluída", "Ela saiu da sua agenda.");
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  const filtered = useMemo(() => {
    const term = busca.trim().toLowerCase();

    const items = agendas.filter((agenda) => {
      if (statusFilter === "proximos" && (agenda.concluido || isPastDate(agenda.data))) {
        return false;
      }
      if (statusFilter === "concluidos" && !agenda.concluido) return false;
      if (bandaFilter !== "all" && String(agenda.idBanda ?? "individual") !== bandaFilter) {
        return false;
      }
      if (tipoFilter !== "all" && agenda.tipoAgenda !== tipoFilter) return false;
      if (term) {
        const haystack = `${agenda.titulo} ${agenda.descricao ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    return sortByDateAndTime(items);
  }, [agendas, statusFilter, bandaFilter, tipoFilter, busca]);

  const calendarItems = useMemo(() => {
    return agendas.filter((agenda) => {
      if (bandaFilter !== "all" && String(agenda.idBanda ?? "individual") !== bandaFilter) {
        return false;
      }
      if (tipoFilter !== "all" && agenda.tipoAgenda !== tipoFilter) return false;
      return true;
    });
  }, [agendas, bandaFilter, tipoFilter]);

  const porDia = useMemo(() => {
    const map = new Map<string, Agenda[]>();

    for (const agenda of calendarItems) {
      const key = toDateOnly(parseDateOnly(agenda.data));
      const list = map.get(key) ?? [];
      list.push(agenda);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.horario.localeCompare(b.horario));
    }

    return map;
  }, [calendarItems]);

  const today = toDateOnly(new Date());
  const celulas = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const proximosCount = agendas.filter(
    (agenda) => !agenda.concluido && !isPastDate(agenda.data)
  ).length;
  const concluidosCount = agendas.filter((agenda) => agenda.concluido).length;

  function openCreate(initialDate?: string) {
    setModal({ mode: "create", initialDate: initialDate ?? today });
  }

  function openAgenda(agenda: Agenda) {
    if (user && canEditAgenda(agenda, bandas, user.idMusico)) {
      setModal({ mode: "edit", agenda });
    } else {
      setDetalhe(agenda);
    }
  }

  async function handleDelete(agenda: Agenda) {
    const ok = await confirm({
      title: "Excluir atividade?",
      message: `"${agenda.titulo}" será removida da agenda. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });

    if (ok) deleteMutation.mutate(agenda.idAgenda);
  }

  const hasError = agendasQuery.isError || bandasQuery.isError || eventosQuery.isError;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Organização"
        title="Agenda"
        subtitle="Compromissos individuais e da banda em uma visão única, sem perder o tempo de ninguém."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => openCreate()}>
            Nova atividade
          </Button>
        }
      />

      <div className="summary-strip">
        <span>
          <strong>{proximosCount}</strong> próximos compromissos
        </span>
        <span className="summary-strip__dot" />
        <span>
          <strong>{concluidosCount}</strong> concluídos
        </span>
        <span className="summary-strip__dot" />
        <span>
          <strong>{agendas.length}</strong> no total
        </span>
      </div>

      <div className="toolbar">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar atividade..."
          ariaLabel="Buscar atividade na agenda"
        />
        <div className="toolbar__filters">
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            aria-label="Filtrar por situação"
          >
            <option value="proximos">Próximos</option>
            <option value="todos">Todos</option>
            <option value="concluidos">Concluídos</option>
          </Select>
          <Select
            value={tipoFilter}
            onChange={(event) => setTipoFilter(event.target.value as "all" | TipoAgenda)}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos os tipos</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="BANDA">Banda</option>
          </Select>
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
            <option value="individual">Individual</option>
          </Select>
        </div>
        <div className="view-toggle" role="group" aria-label="Modo de visualização">
          <button
            type="button"
            className={view === "lista" ? "is-active" : ""}
            onClick={() => setView("lista")}
            aria-pressed={view === "lista"}
          >
            <List size={16} />
            <span>Lista</span>
          </button>
          <button
            type="button"
            className={view === "calendario" ? "is-active" : ""}
            onClick={() => setView("calendario")}
            aria-pressed={view === "calendario"}
          >
            <CalendarDays size={16} />
            <span>Calendário</span>
          </button>
        </div>
      </div>

      {hasError ? (
        <ErrorState
          error={agendasQuery.error ?? bandasQuery.error ?? eventosQuery.error}
          onRetry={() => {
            void agendasQuery.refetch();
            void bandasQuery.refetch();
            void eventosQuery.refetch();
          }}
        />
      ) : agendasQuery.isLoading ? (
        <SkeletonRows count={5} />
      ) : view === "calendario" ? (
        <section className="card calendar-card">
          <header className="calendar-card__head">
            <div>
              <span className="eyebrow">Visão mensal</span>
              <h2>{formatMonthYear(month)}</h2>
            </div>
            <div className="calendar-card__nav">
              <button
                type="button"
                className="icon-button"
                onClick={() => setMonth(addMonths(month, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                Hoje
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </header>

          <div className="calendar">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((dia) => (
              <span key={dia} className="calendar__weekday">
                {dia}
              </span>
            ))}

            {celulas.map((date) => {
              const key = toDateOnly(date);
              const items = porDia.get(key) ?? [];
              const outside = date.getMonth() !== month.getMonth();

              return (
                <div
                  key={key}
                  className={[
                    "calendar__cell",
                    outside ? "is-outside" : "",
                    key === today ? "is-today" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="gridcell"
                >
                  <button
                    type="button"
                    className="calendar__day"
                    onClick={() => openCreate(key)}
                    aria-label={`Criar atividade em ${date.getDate()} de ${formatMonthYear(date)}`}
                  >
                    {date.getDate()}
                  </button>
                  <div className="calendar__items">
                    {items.slice(0, 2).map((agenda) => (
                      <button
                        type="button"
                        key={agenda.idAgenda}
                        className={`calendar__chip calendar__chip--${agenda.tipoAgenda.toLowerCase()} ${agenda.concluido ? "is-done" : ""}`}
                        onClick={() => openAgenda(agenda)}
                        title={agenda.titulo}
                      >
                        {agenda.horario} {agenda.titulo}
                      </button>
                    ))}
                    {items.length > 2 ? (
                      <span className="calendar__more">+{items.length - 2}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            agendas.length === 0
              ? "Sua agenda está livre"
              : "Nenhuma atividade encontrada"
          }
          description={
            agendas.length === 0
              ? "Crie um compromisso individual ou uma atividade compartilhada com a sua banda."
              : "Ajuste os filtros ou cadastre uma nova atividade para começar."
          }
          action={
            <Button icon={<Plus size={16} />} onClick={() => openCreate()}>
              Nova atividade
            </Button>
          }
        />
      ) : (
        <section className="card agenda-list" aria-label="Atividades da agenda">
          {filtered.map((agenda) => {
            const banda = agenda.idBanda ? bandaMap.get(agenda.idBanda) : null;
            const editavel = user ? canEditAgenda(agenda, bandas, user.idMusico) : false;

            return (
              <article
                key={agenda.idAgenda}
                className={`agenda-row ${agenda.concluido ? "is-done" : ""}`}
              >
                <DateBadge date={agenda.data} variant={agenda.tipoAgenda === "BANDA" ? "purple" : "light"} />
                <div className="agenda-row__body">
                  <div className="agenda-row__title">
                    <h3>{agenda.titulo}</h3>
                    <Badge tone={agenda.tipoAgenda === "BANDA" ? "purple" : "neutral"}>
                      {agenda.tipoAgenda === "BANDA" ? <Users size={12} /> : <Lock size={12} />}
                      {agenda.tipoAgenda === "BANDA" ? "Banda" : "Individual"}
                    </Badge>
                    {agenda.concluido ? <Badge tone="green">Concluído</Badge> : null}
                  </div>
                  {agenda.descricao ? <p>{agenda.descricao}</p> : null}
                  <div className="agenda-row__meta">
                    <span>
                      <Clock size={14} />
                      {agenda.horario}
                    </span>
                    <span>
                      {agenda.tipoAgenda === "BANDA"
                        ? banda?.nome ?? "Banda"
                        : "Compromisso individual"}
                    </span>
                    {agenda.criadoPor ? <span>Criado por {agenda.criadoPor}</span> : null}
                    {agenda.visibilidade === "BANDA" ? (
                      <Badge tone="outline">Visível para a banda</Badge>
                    ) : null}
                  </div>
                  <span className="agenda-row__full-date">{formatDateLong(agenda.data)}</span>
                </div>
                <div className="agenda-row__actions">
                  {editavel ? (
                    <>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => toggleMutation.mutate(agenda)}
                        disabled={toggleMutation.isPending}
                        aria-label={agenda.concluido ? "Reabrir atividade" : "Concluir atividade"}
                        title={agenda.concluido ? "Reabrir" : "Marcar como concluída"}
                      >
                        {agenda.concluido ? <Circle size={17} /> : <CheckCircle2 size={17} />}
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => openAgenda(agenda)}
                        aria-label="Editar atividade"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button icon-button--danger"
                        onClick={() => void handleDelete(agenda)}
                        aria-label="Excluir atividade"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setDetalhe(agenda)}
                    >
                      Ver detalhes
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {modal ? (
        <AgendaFormModal
          key={`${modal.mode}-${modal.agenda?.idAgenda ?? modal.initialDate ?? "nova"}`}
          mode={modal.mode}
          agenda={modal.agenda}
          initialDate={modal.initialDate}
          bandas={bandas}
          eventos={eventos}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.agendas });
          }}
        />
      ) : null}

      <Modal
        open={Boolean(detalhe)}
        onClose={() => setDetalhe(null)}
        title={detalhe?.titulo ?? "Detalhes da atividade"}
        description={detalhe ? formatDateLong(detalhe.data) : undefined}
        size="sm"
        footer={
          <Button variant="ghost" onClick={() => setDetalhe(null)}>
            Fechar
          </Button>
        }
      >
        {detalhe ? (
          <div className="stack">
            <div className="detail-row">
              <span>Horário</span>
              <strong>{detalhe.horario}</strong>
            </div>
            <div className="detail-row">
              <span>Tipo</span>
              <strong>
                {detalhe.tipoAgenda === "BANDA"
                  ? `Banda · ${detalhe.idBanda ? bandaMap.get(detalhe.idBanda)?.nome ?? "" : ""}`
                  : "Individual"}
              </strong>
            </div>
            <div className="detail-row">
              <span>Situação</span>
              <strong>{detalhe.concluido ? "Concluída" : "Pendente"}</strong>
            </div>
            {detalhe.descricao ? <p className="muted">{detalhe.descricao}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

interface AgendaFormModalProps {
  mode: "create" | "edit";
  agenda?: Agenda;
  initialDate?: string;
  bandas: Banda[];
  eventos: Evento[];
  idMusico: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FormErrors {
  titulo?: string;
  data?: string;
  horario?: string;
  idBanda?: string;
}

function AgendaFormModal({
  mode,
  agenda,
  initialDate,
  bandas,
  eventos,
  idMusico,
  onClose,
  onSaved
}: AgendaFormModalProps) {
  const toast = useToast();
  const lideradas = ledBands(bandas, idMusico);

  const [titulo, setTitulo] = useState(agenda?.titulo ?? "");
  const [descricao, setDescricao] = useState(agenda?.descricao ?? "");
  const [data, setData] = useState(
    agenda ? toDateOnly(parseDateOnly(agenda.data)) : initialDate ?? toDateOnly(new Date())
  );
  const [horario, setHorario] = useState(agenda?.horario ?? "19:00");
  const [tipoAgenda, setTipoAgenda] = useState<TipoAgenda>(agenda?.tipoAgenda ?? "INDIVIDUAL");
  const [idBanda, setIdBanda] = useState(
    agenda?.idBanda ? String(agenda.idBanda) : lideradas[0] ? String(lideradas[0].idBanda) : ""
  );
  const [idEvento, setIdEvento] = useState(agenda?.idEvento ? String(agenda.idEvento) : "");
  const [concluido, setConcluido] = useState(agenda?.concluido ?? false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const eventosDisponiveis = eventos.filter((evento) =>
    tipoAgenda === "BANDA" && idBanda ? evento.idBanda === Number(idBanda) : true
  );

  async function handleSubmit() {
    const nextErrors: FormErrors = {};

    if (titulo.trim().length < 2) nextErrors.titulo = "Informe um título com pelo menos 2 caracteres";
    if (!data) nextErrors.data = "Informe a data";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) nextErrors.horario = "Informe um horário válido";
    if (tipoAgenda === "BANDA" && !idBanda) nextErrors.idBanda = "Selecione a banda";

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      if (mode === "create") {
        await agendasService.criar({
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          data,
          horario,
          concluido,
          tipoAgenda,
          ...(tipoAgenda === "BANDA" ? { idBanda: Number(idBanda) } : {}),
          ...(idEvento ? { idEvento: Number(idEvento) } : {})
        });
        toast.success("Atividade criada", "A agenda já está atualizada.");
      } else if (agenda) {
        await agendasService.atualizar(agenda.idAgenda, {
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          data,
          horario,
          concluido,
          idEvento: idEvento ? Number(idEvento) : null
        });
        toast.success("Atividade atualizada", "As alterações foram salvas.");
      }

      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          titulo: error.fields.titulo,
          data: error.fields.data,
          horario: error.fields.horario,
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
      title={mode === "create" ? "Nova atividade" : "Editar atividade"}
      description="Compromissos individuais ficam só com você; atividades de banda aparecem para todos os integrantes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={() => void handleSubmit()} icon={<Check size={16} />}>
            {mode === "create" ? "Criar atividade" : "Salvar alterações"}
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

        <Field label="Título" htmlFor="agenda-titulo" error={errors.titulo} required>
          <Input
            id="agenda-titulo"
            data-autofocus
            value={titulo}
            invalid={Boolean(errors.titulo)}
            placeholder="Ex.: Ensaio geral, reunião de setlist..."
            onChange={(event) => setTitulo(event.target.value)}
          />
        </Field>

        <div className="form-grid form-grid--two">
          <Field label="Data" htmlFor="agenda-data" error={errors.data} required>
            <Input
              id="agenda-data"
              type="date"
              value={data}
              invalid={Boolean(errors.data)}
              onChange={(event) => setData(event.target.value)}
            />
          </Field>
          <Field label="Horário" htmlFor="agenda-horario" error={errors.horario} required>
            <Input
              id="agenda-horario"
              type="time"
              value={horario}
              invalid={Boolean(errors.horario)}
              onChange={(event) => setHorario(event.target.value)}
            />
          </Field>
        </div>

        {mode === "create" ? (
          <Field label="Tipo de agenda" required>
            <div className="segmented">
              <button
                type="button"
                className={tipoAgenda === "INDIVIDUAL" ? "is-active" : ""}
                onClick={() => setTipoAgenda("INDIVIDUAL")}
              >
                <Lock size={15} />
                Individual
              </button>
              <button
                type="button"
                className={tipoAgenda === "BANDA" ? "is-active" : ""}
                onClick={() => setTipoAgenda("BANDA")}
                disabled={lideradas.length === 0}
              >
                <Users size={15} />
                Banda
              </button>
            </div>
            {lideradas.length === 0 ? (
              <span className="field__hint">
                Apenas líderes de banda podem criar atividades compartilhadas.
              </span>
            ) : null}
          </Field>
        ) : (
          <div className="inline-note">
            O tipo e a banda de uma atividade não podem ser alterados depois da criação.
          </div>
        )}

        {tipoAgenda === "BANDA" ? (
          <Field label="Banda" htmlFor="agenda-banda" error={errors.idBanda} required>
            <Select
              id="agenda-banda"
              value={idBanda}
              disabled={mode === "edit"}
              invalid={Boolean(errors.idBanda)}
              onChange={(event) => {
                setIdBanda(event.target.value);
                setIdEvento("");
              }}
            >
              <option value="">Selecione...</option>
              {lideradas.map((banda) => (
                <option key={banda.idBanda} value={String(banda.idBanda)}>
                  {banda.nome}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field
          label="Vincular a um evento"
          htmlFor="agenda-evento"
          hint="Opcional. O evento precisa pertencer a uma banda da qual você participa."
        >
          <Select
            id="agenda-evento"
            value={idEvento}
            onChange={(event) => setIdEvento(event.target.value)}
          >
            <option value="">Nenhum evento</option>
            {eventosDisponiveis.map((evento) => (
              <option key={evento.idEvento} value={String(evento.idEvento)}>
                {evento.nome} · {toDateOnly(parseDateOnly(evento.data))}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Descrição" htmlFor="agenda-descricao">
          <Textarea
            id="agenda-descricao"
            rows={3}
            value={descricao}
            placeholder="Detalhes, local, pauta do encontro..."
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={concluido}
            onChange={(event) => setConcluido(event.target.checked)}
          />
          <span>Já concluído</span>
        </label>
      </div>
    </Modal>
  );
}
