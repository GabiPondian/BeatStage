import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Pencil,
  Plus,
  Search,
  Speaker,
  Trash2,
  UserRound
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useBandas, useEquipamentos, queryKeys } from "../hooks/queries";
import { equipamentosService } from "../services/equipamentos.service";
import { ledBands } from "../lib/permissions";
import { ESTADOS_EQUIPAMENTO, ESTADO_LABEL } from "../lib/constants";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Banda, Equipamento, EstadoEquipamento } from "../types/api";

interface ModalState {
  mode: "create" | "edit";
  equipamento?: Equipamento;
}

export function EquipmentPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const equipamentosQuery = useEquipamentos();
  const bandasQuery = useBandas();

  const [busca, setBusca] = useState("");
  const [bandaFilter, setBandaFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState<"all" | EstadoEquipamento>("all");
  const [modal, setModal] = useState<ModalState | null>(null);

  const equipamentos = equipamentosQuery.data ?? [];
  const bandas = bandasQuery.data ?? [];
  const lideradas = ledBands(bandas, user?.idMusico ?? 0);

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda])),
    [bandas]
  );

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return equipamentos.filter((item) => {
      if (bandaFilter !== "all" && String(item.idBanda) !== bandaFilter) return false;
      if (estadoFilter !== "all" && item.estado !== estadoFilter) return false;
      if (term) {
        const haystack = `${item.nome} ${item.responsavel ?? ""} ${item.descricao ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [equipamentos, bandaFilter, estadoFilter, busca]);

  const proprios = equipamentos.filter((item) => item.estado === "PROPRIO").length;
  const emprestados = equipamentos.filter((item) => item.estado === "EMPRESTADO").length;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => equipamentosService.excluir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.equipamentos });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
      toast.success("Equipamento excluído", "O item saiu do inventário da banda.");
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  async function handleDelete(equipamento: Equipamento) {
    const ok = await confirm({
      title: "Excluir equipamento?",
      message: `"${equipamento.nome}" será removido do inventário e dos eventos vinculados.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate(equipamento.idEquipamento);
  }

  const error = equipamentosQuery.error ?? bandasQuery.error;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Estrutura"
        title="Equipamentos"
        subtitle="O inventário da banda: o que é próprio, o que é emprestado e quem responde por cada item."
        actions={
          lideradas.length > 0 ? (
            <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
              Novo equipamento
            </Button>
          ) : undefined
        }
      />

      {lideradas.length === 0 && equipamentos.length > 0 ? (
        <div className="inline-note">
          Apenas o líder da banda pode cadastrar, editar ou excluir equipamentos. Você pode
          consultar o inventário completo abaixo.
        </div>
      ) : null}

      <div className="summary-strip">
        <span>
          <strong>{equipamentos.length}</strong> itens no inventário
        </span>
        <span className="summary-strip__dot" />
        <span>
          <strong>{proprios}</strong> próprios
        </span>
        <span className="summary-strip__dot" />
        <span>
          <strong>{emprestados}</strong> emprestados
        </span>
      </div>

      <div className="toolbar">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar equipamento ou responsável..."
          ariaLabel="Buscar equipamento"
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
            value={estadoFilter}
            onChange={(event) => setEstadoFilter(event.target.value as typeof estadoFilter)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos os estados</option>
            <option value="PROPRIO">Próprio</option>
            <option value="EMPRESTADO">Emprestado</option>
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void equipamentosQuery.refetch();
            void bandasQuery.refetch();
          }}
        />
      ) : equipamentosQuery.isLoading ? (
        <SkeletonRows count={5} />
      ) : equipamentos.length === 0 ? (
        <EmptyState
          icon={Speaker}
          title="Inventário vazio"
          description={
            lideradas.length > 0
              ? "Cadastre instrumentos, amplificadores, mesas e tudo que a banda usa nos ensaios e shows."
              : "Quando o líder cadastrar equipamentos, eles aparecem aqui."
          }
          action={
            lideradas.length > 0 ? (
              <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
                Cadastrar equipamento
              </Button>
            ) : undefined
          }
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum equipamento encontrado"
          description="Ajuste a busca ou os filtros de banda e estado."
        />
      ) : (
        <section className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Estado</th>
                  <th>Responsável</th>
                  <th>Banda</th>
                  <th>Descrição</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((equipamento) => {
                  const banda = bandaMap.get(equipamento.idBanda);
                  const podeEditar = Boolean(
                    user && banda && banda.idLider === user.idMusico
                  );

                  return (
                    <tr key={equipamento.idEquipamento}>
                      <td>
                        <div className="equipment-cell">
                          <span className="equipment-cell__icon">
                            <Speaker size={16} />
                          </span>
                          <strong>{equipamento.nome}</strong>
                        </div>
                      </td>
                      <td>
                        <Badge tone={equipamento.estado === "PROPRIO" ? "purple" : "orange"}>
                          {ESTADO_LABEL[equipamento.estado]}
                        </Badge>
                      </td>
                      <td>{equipamento.responsavel || <span className="muted">—</span>}</td>
                      <td>
                        <span className="band-pill">{banda?.nome ?? "Banda"}</span>
                      </td>
                      <td>
                        <span className="cell-description">
                          {equipamento.descricao || <span className="muted">Sem descrição</span>}
                        </span>
                      </td>
                      <td>
                        {podeEditar ? (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => setModal({ mode: "edit", equipamento })}
                              aria-label={`Editar ${equipamento.nome}`}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              onClick={() => void handleDelete(equipamento)}
                              aria-label={`Excluir ${equipamento.nome}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {filtrados.map((equipamento) => {
              const banda = bandaMap.get(equipamento.idBanda);
              const podeEditar = Boolean(user && banda && banda.idLider === user.idMusico);

              return (
                <article key={equipamento.idEquipamento} className="equipment-card">
                  <div className="equipment-card__head">
                    <span className="equipment-cell__icon">
                      <Speaker size={18} />
                    </span>
                    <div>
                      <strong>{equipamento.nome}</strong>
                      <span>{banda?.nome}</span>
                    </div>
                    <Badge tone={equipamento.estado === "PROPRIO" ? "purple" : "orange"}>
                      {ESTADO_LABEL[equipamento.estado]}
                    </Badge>
                  </div>
                  <div className="equipment-card__meta">
                    <span>
                      <UserRound size={13} />
                      {equipamento.responsavel || "Sem responsável"}
                    </span>
                  </div>
                  {equipamento.descricao ? <p>{equipamento.descricao}</p> : null}
                  {podeEditar ? (
                    <div className="equipment-card__actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => setModal({ mode: "edit", equipamento })}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => void handleDelete(equipamento)}
                      >
                        Excluir
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {modal ? (
        <EquipmentFormModal
          key={`${modal.mode}-${modal.equipamento?.idEquipamento ?? "novo"}`}
          mode={modal.mode}
          equipamento={modal.equipamento}
          bandas={bandas}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.equipamentos });
            void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
          }}
        />
      ) : null}
    </div>
  );
}

function EquipmentFormModal({
  mode,
  equipamento,
  bandas,
  idMusico,
  onClose,
  onSaved
}: {
  mode: "create" | "edit";
  equipamento?: Equipamento;
  bandas: Banda[];
  idMusico: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const lideradas = ledBands(bandas, idMusico);

  const [idBanda, setIdBanda] = useState(
    equipamento ? String(equipamento.idBanda) : lideradas[0] ? String(lideradas[0].idBanda) : ""
  );
  const [nome, setNome] = useState(equipamento?.nome ?? "");
  const [estado, setEstado] = useState<EstadoEquipamento>(equipamento?.estado ?? "PROPRIO");
  const [responsavel, setResponsavel] = useState(equipamento?.responsavel ?? "");
  const [descricao, setDescricao] = useState(equipamento?.descricao ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!idBanda) nextErrors.idBanda = "Selecione a banda";
    if (nome.trim().length < 2) nextErrors.nome = "Informe o nome do equipamento";

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    try {
      if (mode === "create") {
        await equipamentosService.criar({
          idBanda: Number(idBanda),
          nome: nome.trim(),
          estado,
          ...(responsavel.trim() ? { responsavel: responsavel.trim() } : {}),
          ...(descricao.trim() ? { descricao: descricao.trim() } : {})
        });
        toast.success("Equipamento cadastrado", "O item já está no inventário da banda.");
      } else if (equipamento) {
        await equipamentosService.atualizar(equipamento.idEquipamento, {
          nome: nome.trim(),
          estado,
          responsavel: responsavel.trim() || null,
          descricao: descricao.trim() || null
        });
        toast.success("Equipamento atualizado", "As alterações foram salvas.");
      }

      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          nome: error.fields.nome,
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
      title={mode === "create" ? "Novo equipamento" : "Editar equipamento"}
      description="Registre o que a banda usa e quem é o responsável por cada item."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={() => void handleSubmit()} icon={<Check size={16} />}>
            {mode === "create" ? "Cadastrar" : "Salvar alterações"}
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

        <Field label="Banda" htmlFor="equipamento-banda" error={errors.idBanda} required>
          <Select
            id="equipamento-banda"
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

        <div className="form-grid form-grid--two">
          <Field label="Nome" htmlFor="equipamento-nome" error={errors.nome} required>
            <Input
              id="equipamento-nome"
              data-autofocus
              value={nome}
              placeholder="Ex.: Guitarra Fender Stratocaster"
              invalid={Boolean(errors.nome)}
              onChange={(event) => setNome(event.target.value)}
            />
          </Field>
          <Field label="Estado" htmlFor="equipamento-estado" required>
            <Select
              id="equipamento-estado"
              value={estado}
              onChange={(event) => setEstado(event.target.value as EstadoEquipamento)}
            >
              {ESTADOS_EQUIPAMENTO.map((valor) => (
                <option key={valor} value={valor}>
                  {ESTADO_LABEL[valor]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Responsável" htmlFor="equipamento-responsavel" hint="Quem cuida ou responde pelo item.">
          <Input
            id="equipamento-responsavel"
            value={responsavel}
            placeholder="Ex.: Lucas Prado"
            onChange={(event) => setResponsavel(event.target.value)}
          />
        </Field>

        <Field label="Descrição" htmlFor="equipamento-descricao">
          <Textarea
            id="equipamento-descricao"
            rows={3}
            value={descricao}
            placeholder="Marca, modelo, detalhes de conservação..."
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

