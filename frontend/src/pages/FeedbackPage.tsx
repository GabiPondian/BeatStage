import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  EyeOff,
  MessageSquareQuote,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Field, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { useBandas, useFeedbacks, useMusicos, queryKeys } from "../hooks/queries";
import { feedbacksService } from "../services/feedbacks.service";
import { canManageBand } from "../lib/permissions";
import { pluralize } from "../lib/format";
import { mensagemDeErro } from "../lib/api";
import type { Feedback } from "../types/api";

export function FeedbackPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const feedbacksQuery = useFeedbacks();
  const bandasQuery = useBandas();
  const musicosQuery = useMusicos();

  const feedbacks = feedbacksQuery.data ?? [];
  const bandas = bandasQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];

  const [bandaNova, setBandaNova] = useState(bandas[0] ? String(bandas[0].idBanda) : "");
  const [comentario, setComentario] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bandaFilter, setBandaFilter] = useState("all");
  const [editando, setEditando] = useState<Feedback | null>(null);

  useEffect(() => {
    if (bandas.length === 0) return;
    const existe = bandas.some((banda) => String(banda.idBanda) === bandaNova);
    if (!existe) setBandaNova(String(bandas[0]!.idBanda));
  }, [bandas, bandaNova]);

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda])),
    [bandas]
  );
  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const filtrados = useMemo(() => {
    return feedbacks.filter((feedback) => {
      if (bandaFilter !== "all" && String(feedback.idBanda) !== bandaFilter) return false;
      return true;
    });
  }, [feedbacks, bandaFilter]);

  const anonimos = feedbacks.filter((feedback) => feedback.anonimo).length;

  const createMutation = useMutation({
    mutationFn: () =>
      feedbacksService.criar({
        idBanda: Number(bandaNova),
        comentario: comentario.trim(),
        anonimo
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbacks });
      setComentario("");
      setAnonimo(false);
      setFormError(null);
      toast.success("Feedback enviado", "Obrigado por ajudar a banda a evoluir.");
    },
    onError: (error) => setFormError(mensagemDeErro(error))
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => feedbacksService.excluir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feedbacks });
      toast.success("Feedback excluído", "O comentário saiu do mural.");
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  async function submitFeedback() {
    setFormError(null);
    if (!bandaNova) {
      setFormError("Selecione a banda sobre a qual você quer falar");
      return;
    }
    if (comentario.trim().length < 2) {
      setFormError("Escreva um comentário com pelo menos 2 caracteres");
      return;
    }
    createMutation.mutate();
  }

  async function handleDelete(feedback: Feedback) {
    const ok = await confirm({
      title: "Excluir feedback?",
      message: "O comentário será removido do mural da banda.",
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate(feedback.idFeedback);
  }

  function podeGerenciar(feedback: Feedback): boolean {
    if (!user) return false;
    if (feedback.idMusico === user.idMusico) return true;
    return canManageBand(bandas, feedback.idBanda, user.idMusico);
  }

  const error = feedbacksQuery.error ?? bandasQuery.error ?? musicosQuery.error;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Escuta ativa"
        title="Feedback"
        subtitle="Um espaço seguro para elogiar, sugerir e ajustar o som da banda antes do próximo show."
      />

      {bandas.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="Entre em uma banda para deixar feedback"
          description="O feedback é sempre ligado a uma banda da qual você participa."
        />
      ) : (
        <div className="feedback-grid">
          <div className="stack">
            <section className="card feedback-compose">
              <div className="feedback-compose__head">
                <span className="feedback-compose__icon">
                  <MessageSquareQuote size={20} />
                </span>
                <div>
                  <h2>Deixe seu comentário</h2>
                  <p>Sua opinião chega direto ao mural da banda.</p>
                </div>
              </div>

              {formError ? (
                <div className="alert alert--error" role="alert">
                  {formError}
                </div>
              ) : null}

              <Field label="Banda" htmlFor="feedback-banda" required>
                <Select
                  id="feedback-banda"
                  value={bandaNova}
                  onChange={(event) => setBandaNova(event.target.value)}
                >
                  {bandas.map((banda) => (
                    <option key={banda.idBanda} value={String(banda.idBanda)}>
                      {banda.nome}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Comentário"
                htmlFor="feedback-comentario"
                hint={`${comentario.length}/2000 caracteres`}
                required
              >
                <Textarea
                  id="feedback-comentario"
                  rows={4}
                  maxLength={2000}
                  value={comentario}
                  placeholder="O que funcionou bem? O que pode melhorar no próximo ensaio ou show?"
                  onChange={(event) => setComentario(event.target.value)}
                />
              </Field>

              <div className="feedback-compose__footer">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={anonimo}
                    onChange={(event) => setAnonimo(event.target.checked)}
                  />
                  <EyeOff size={15} />
                  <span>Enviar anonimamente</span>
                </label>
                <Button
                  icon={<Send size={15} />}
                  loading={createMutation.isPending}
                  onClick={() => void submitFeedback()}
                >
                  Enviar feedback
                </Button>
              </div>
            </section>

            <section className="card">
              <header className="panel-head">
                <div>
                  <span className="eyebrow">Mural</span>
                  <h2>Comentários recentes</h2>
                </div>
                <Select
                  value={bandaFilter}
                  onChange={(event) => setBandaFilter(event.target.value)}
                  aria-label="Filtrar feedback por banda"
                >
                  <option value="all">Todas as bandas</option>
                  {bandas.map((banda) => (
                    <option key={banda.idBanda} value={String(banda.idBanda)}>
                      {banda.nome}
                    </option>
                  ))}
                </Select>
              </header>

              {error ? (
                <ErrorState
                  error={error}
                  onRetry={() => {
                    void feedbacksQuery.refetch();
                    void bandasQuery.refetch();
                    void musicosQuery.refetch();
                  }}
                />
              ) : feedbacksQuery.isLoading ? (
                <SkeletonRows count={3} />
              ) : filtrados.length === 0 ? (
                <EmptyState
                  icon={MessageSquareQuote}
                  title="Nenhum feedback ainda"
                  description="Seja o primeiro a abrir a conversa com a banda."
                  compact
                />
              ) : (
                <ul className="feedback-list">
                  {filtrados.map((feedback) => {
                    const banda = bandaMap.get(feedback.idBanda);
                    const autor = feedback.idMusico
                      ? musicosMap.get(feedback.idMusico)
                      : undefined;
                    const gerenciar = podeGerenciar(feedback);
                    const nomeAutor = feedback.anonimo
                      ? "Membro anônimo"
                      : autor?.nome ?? "Músico";

                    return (
                      <li
                        key={feedback.idFeedback}
                        className={`feedback-card ${feedback.anonimo ? "is-anonymous" : ""}`}
                      >
                        <Avatar
                          name={feedback.anonimo ? "Anônimo" : nomeAutor}
                          src={feedback.anonimo ? null : autor?.fotoPerfil}
                          size="sm"
                        />
                        <div className="feedback-card__body">
                          <div className="feedback-card__head">
                            <div>
                              <strong>{nomeAutor}</strong>
                              <span>{banda?.nome ?? "Banda"}</span>
                            </div>
                            {feedback.anonimo ? (
                              <Badge tone="outline">
                                <EyeOff size={12} /> Anônimo
                              </Badge>
                            ) : (
                              <Badge tone="purple">
                                <UserRound size={12} /> Identificado
                              </Badge>
                            )}
                          </div>
                          <p>{feedback.comentario}</p>
                          {gerenciar ? (
                            <div className="feedback-card__actions">
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => setEditando(feedback)}
                              >
                                <Pencil size={14} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn--danger-ghost btn--sm"
                                onClick={() => void handleDelete(feedback)}
                              >
                                <Trash2 size={14} />
                                <span>Excluir</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <aside className="stack">
            <section className="card side-card side-card--purple">
              <span className="side-card__icon">
                <ShieldCheck size={20} />
              </span>
              <h2>Feedback construtivo</h2>
              <p>
                Comentários são mais úteis quando descrevem situações concretas. Prefira
                “o solo da terceira música ficou baixo” a “o show foi ruim”.
              </p>
              <ul className="side-card__list">
                <li>Seja específico e respeitoso.</li>
                <li>Anonimato protege o autor, não o conteúdo.</li>
                <li>O líder pode moderar o mural.</li>
              </ul>
            </section>

            <section className="card side-card">
              <span className="eyebrow">Números do mural</span>
              <strong className="big-number">{feedbacks.length}</strong>
              <p>
                {feedbacks.length === 1 ? "comentário registrado" : "comentários registrados"}
              </p>
              <div className="side-card__stat">
                <span>
                  <EyeOff size={14} /> Anônimos
                </span>
                <strong>{anonimos}</strong>
              </div>
              <div className="side-card__stat">
                <span>
                  <Check size={14} /> Identificados
                </span>
                <strong>{feedbacks.length - anonimos}</strong>
              </div>
              <p className="muted small">
                {bandas.length} {pluralize(bandas.length, "banda", "bandas")} no seu mural.
              </p>
            </section>
          </aside>
        </div>
      )}

      {editando ? (
        <EditFeedbackModal
          feedback={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.feedbacks });
          }}
        />
      ) : null}
    </div>
  );
}

function EditFeedbackModal({
  feedback,
  onClose,
  onSaved
}: {
  feedback: Feedback;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [comentario, setComentario] = useState(feedback.comentario);
  const [anonimo, setAnonimo] = useState(feedback.anonimo);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      feedbacksService.atualizar(feedback.idFeedback, {
        comentario: comentario.trim(),
        anonimo
      }),
    onSuccess: () => {
      toast.success("Feedback atualizado", "O mural já mostra a nova versão.");
      onSaved();
    },
    onError: (err) => setError(mensagemDeErro(err))
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar feedback"
      description="Atualize o comentário ou mude a forma de identificação."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => {
              setError(null);
              if (comentario.trim().length < 2) {
                setError("O comentário deve ter pelo menos 2 caracteres");
                return;
              }
              mutation.mutate();
            }}
            icon={<Check size={16} />}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="stack">
        {error ? (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        ) : null}
        <Field label="Comentário" htmlFor="editar-feedback" required>
          <Textarea
            id="editar-feedback"
            data-autofocus
            rows={4}
            maxLength={2000}
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
          />
        </Field>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={anonimo}
            onChange={(event) => setAnonimo(event.target.checked)}
          />
          <EyeOff size={15} />
          <span>Manter anônimo</span>
        </label>
      </div>
    </Modal>
  );
}
