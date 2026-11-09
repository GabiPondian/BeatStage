import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock,
  MapPin,
  Mic2,
  Pencil,
  Plus,
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
import { useBandas, useEnsaios, queryKeys } from "../hooks/queries";
import { ensaiosService } from "../services/ensaios.service";
import {
  daysUntil,
  formatDateLong,
  isPastDate,
  parseDateOnly,
  relativeDay,
  toDateOnly
} from "../lib/format";
import { canManageBand, ledBands } from "../lib/permissions";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Banda, Ensaio } from "../types/api";

interface ModalState {
  mode: "create" | "edit";
  ensaio?: Ensaio;
}

export function RehearsalsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const ensaiosQuery = useEnsaios();
  const bandasQuery = useBandas();

  const [busca, setBusca] = useState("");
  const [bandaFilter, setBandaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"proximos" | "todos" | "realizados">("proximos");
  const [modal, setModal] = useState<ModalState | null>(null);

  const ensaios = ensaiosQuery.data ?? [];
  const bandas = bandasQuery.data ?? [];
  const lideradas = ledBands(bandas, user?.idMusico ?? 0);

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda])),
    [bandas]
  );

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return ensaios.filter((ensaio) => {
      if (bandaFilter !== "all" && String(ensaio.idBanda) !== bandaFilter) return false;
      if (statusFilter === "proximos" && isPastDate(ensaio.data)) return false;
      if (statusFilter === "realizados" && !isPastDate(ensaio.data)) return false;
      if (term) {
        const haystack = `${ensaio.descricao ?? ""} ${ensaio.local ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [ensaios, bandaFilter, statusFilter, busca]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ensaiosService.excluir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ensaios });
      toast.success("Ensaio excluído", "O encontro saiu da lista.");
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  async function handleDelete(ensaio: Ensaio) {
    const ok = await confirm({
      title: "Excluir ensaio?",
      message: `O ensaio de ${formatDateLong(ensaio.data)} será removido da banda.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate(ensaio.idEnsaio);
  }

  const error = ensaiosQuery.error ?? bandasQuery.error;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Preparação"
        title="Ensaios"
        subtitle="Os encontros que mantêm a banda afiada — com data, local e pauta."
        actions={
          lideradas.length > 0 ? (
            <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
              Novo ensaio
            </Button>
          ) : undefined
        }
      />

      {lideradas.length === 0 && ensaios.length > 0 ? (
        <div className="inline-note">
          Apenas o líder da banda pode agendar, editar ou excluir ensaios. Consulte abaixo os
          próximos encontros.
        </div>
      ) : null}

      <div className="toolbar">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar ensaio..."
          ariaLabel="Buscar ensaio"
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
            void ensaiosQuery.refetch();
            void bandasQuery.refetch();
          }}
        />
      ) : ensaiosQuery.isLoading ? (
        <SkeletonCards count={3} />
      ) : ensaios.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="Nenhum ensaio agendado"
          description={
            lideradas.length > 0
              ? "Marque o próximo encontro da banda para alinhar o repertório e a performance."
              : "Quando o líder agendar um ensaio, ele aparece aqui."
          }
          action={
            lideradas.length > 0 ? (
              <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
                Agendar ensaio
              </Button>
            ) : undefined
          }
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="Nenhum ensaio encontrado"
          description="Ajuste os filtros ou agende um novo encontro."
        />
      ) : (
        <div className="rehearsal-list">
          {filtrados.map((ensaio) => {
            const banda = bandaMap.get(ensaio.idBanda);
            const podeEditar = Boolean(
              user && canManageBand(bandas, ensaio.idBanda, user.idMusico)
            );
            const diff = daysUntil(ensaio.data);
            const contexto = isPastDate(ensaio.data)
              ? "Realizado"
              : diff === 0
                ? "É hoje"
                : relativeDay(ensaio.data);

            return (
              <article key={ensaio.idEnsaio} className={`rehearsal-card ${isPastDate(ensaio.data) ? "is-past" : ""}`}>
                <DateBadge date={ensaio.data} variant="purple" size="md" />
                <div className="rehearsal-card__body">
                  <div className="rehearsal-card__title">
                    <h2>{ensaio.descricao?.trim() || "Ensaio da banda"}</h2>
                    <Badge tone={isPastDate(ensaio.data) ? "neutral" : diff === 0 ? "yellow" : "purple"}>
                      {contexto}
                    </Badge>
                  </div>
                  <div className="rehearsal-card__meta">
                    <span>
                      <Mic2 size={14} />
                      {banda?.nome ?? "Banda"}
                    </span>
                    <span>
                      <MapPin size={14} />
                      {ensaio.local || "Local a definir"}
                    </span>
                    <span>
                      <CalendarDays size={14} />
                      {formatDateLong(ensaio.data)}
                    </span>
                  </div>
                  {ensaio.descricao ? null : (
                    <p className="muted small">
                      Sem pauta registrada. O líder pode editar o ensaio para incluir detalhes.
                    </p>
                  )}
                </div>
                {podeEditar ? (
                  <div className="rehearsal-card__actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setModal({ mode: "edit", ensaio })}
                      aria-label="Editar ensaio"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      onClick={() => void handleDelete(ensaio)}
                      aria-label="Excluir ensaio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <Clock size={16} className="muted" />
                )}
              </article>
            );
          })}
        </div>
      )}

      {modal ? (
        <RehearsalFormModal
          key={`${modal.mode}-${modal.ensaio?.idEnsaio ?? "novo"}`}
          mode={modal.mode}
          ensaio={modal.ensaio}
          bandas={bandas}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.ensaios });
          }}
        />
      ) : null}
    </div>
  );
}

function RehearsalFormModal({
  mode,
  ensaio,
  bandas,
  idMusico,
  onClose,
  onSaved
}: {
  mode: "create" | "edit";
  ensaio?: Ensaio;
  bandas: Banda[];
  idMusico: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const lideradas = ledBands(bandas, idMusico);

  const [idBanda, setIdBanda] = useState(
    ensaio ? String(ensaio.idBanda) : lideradas[0] ? String(lideradas[0].idBanda) : ""
  );
  const [data, setData] = useState(
    ensaio ? toDateOnly(parseDateOnly(ensaio.data)) : toDateOnly(new Date())
  );
  const [local, setLocal] = useState(ensaio?.local ?? "");
  const [descricao, setDescricao] = useState(ensaio?.descricao ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!idBanda) nextErrors.idBanda = "Selecione a banda";
    if (!data) nextErrors.data = "Informe a data";

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      if (mode === "create") {
        await ensaiosService.criar({
          idBanda: Number(idBanda),
          data,
          ...(local.trim() ? { local: local.trim() } : {}),
          ...(descricao.trim() ? { descricao: descricao.trim() } : {})
        });
        toast.success("Ensaio agendado", "O encontro entrou nos próximos compromissos.");
      } else if (ensaio) {
        await ensaiosService.atualizar(ensaio.idEnsaio, {
          data,
          local: local.trim() || null,
          descricao: descricao.trim() || null
        });
        toast.success("Ensaio atualizado", "As alterações foram salvas.");
      }

      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
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
      title={mode === "create" ? "Novo ensaio" : "Editar ensaio"}
      description="Agende o encontro da banda e deixe a pauta combinada."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={() => void handleSubmit()} icon={<Check size={16} />}>
            {mode === "create" ? "Agendar ensaio" : "Salvar alterações"}
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

        <Field label="Banda" htmlFor="ensaio-banda" error={errors.idBanda} required>
          <Select
            id="ensaio-banda"
            value={idBanda}
            disabled={mode === "edit"}
            invalid={Boolean(errors.idBanda)}
            onChange={(event) => setIdBanda(event.target.value)}
          >
            {lideradas.map((banda) => (
              <option key={banda.idBanda} value={String(banda.idBanda)}>
                {banda.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Data" htmlFor="ensaio-data" error={errors.data} required>
          <Input
            id="ensaio-data"
            type="date"
            value={data}
            invalid={Boolean(errors.data)}
            onChange={(event) => setData(event.target.value)}
          />
        </Field>

        <Field label="Local" htmlFor="ensaio-local">
          <Input
            id="ensaio-local"
            value={local}
            placeholder="Ex.: Estúdio Central"
            onChange={(event) => setLocal(event.target.value)}
          />
        </Field>

        <Field label="Pauta do ensaio" htmlFor="ensaio-descricao">
          <Textarea
            id="ensaio-descricao"
            rows={3}
            value={descricao}
            placeholder="O que será trabalhado? Músicas, arranjos, passagem de som..."
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>

        <div className="inline-note">
          O ensaio aparece nos próximos compromissos e nos avisos do BeatStage.
        </div>
      </div>
    </Modal>
  );
}

