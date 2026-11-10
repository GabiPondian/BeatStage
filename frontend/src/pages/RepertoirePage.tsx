import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  ListMusic,
  Music2,
  Pencil,
  Plus,
  Trash2,
  Users
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { MusicAutocomplete } from "../components/ui/MusicAutocomplete";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  useBandas,
  useMusicos,
  useRepertorios,
  queryKeys
} from "../hooks/queries";
import { repertoriosService } from "../services/repertorios.service";
import type { SugestaoMusica } from "../services/musicas.service";
import { tomService } from "../lib/tom";
import {
  formatDuration,
  formatTotalDuration,
  inputToSeconds,
  pluralize,
  secondsToInput
} from "../lib/format";
import { ledBands } from "../lib/permissions";
import { ApiError, mensagemDeErro } from "../lib/api";
import { TONS_MUSICAIS } from "../lib/constants";
import type { Banda, Musico, Repertorio } from "../types/api";

interface ModalState {
  mode: "create" | "edit";
  musica?: Repertorio;
}

function SongFormModal({
  mode,
  musica,
  bandas,
  musicos,
  idMusico,
  onClose,
  onSaved
}: {
  mode: "create" | "edit";
  musica?: Repertorio;
  bandas: Banda[];
  musicos: Musico[];
  idMusico: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const lideradas = ledBands(bandas, idMusico);

  const [idBanda, setIdBanda] = useState(
    musica ? String(musica.idBanda) : lideradas[0] ? String(lideradas[0].idBanda) : ""
  );
  const [nome, setNome] = useState(musica?.musica ?? "");
  const [artista, setArtista] = useState(musica?.artista ?? "");
  const [tom, setTom] = useState(musica?.tom ?? "");
  const [duracao, setDuracao] = useState(secondsToInput(musica?.duracaoSegundos));
  const [observacao, setObservacao] = useState(musica?.observacao ?? "");
  const [selecionados, setSelecionados] = useState<Record<number, string>>(() => {
    const inicial: Record<number, string> = {};
    for (const item of musica?.musicos ?? []) {
      inicial[item.idMusico] = item.funcaoMusico ?? "";
    }
    return inicial;
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detectandoTom, setDetectandoTom] = useState(false);
  const [tomAutomatico, setTomAutomatico] = useState(false);
  const tomEditadoRef = useRef(false);

  const bandaSelecionada = bandas.find((banda) => String(banda.idBanda) === idBanda);
  const membrosDaBanda = bandaSelecionada
    ? Array.from(new Set([bandaSelecionada.idLider, ...bandaSelecionada.idMembros]))
        .map((id) => musicos.find((musico) => musico.idMusico === id))
        .filter((musico): musico is Musico => Boolean(musico))
    : [];

  /** Preenche artista, duração e tom a partir da sugestão escolhida. */
  function aplicarSugestao(sugestao: SugestaoMusica) {
    setNome(sugestao.titulo);
    setArtista(sugestao.artista);
    if (sugestao.duracaoSegundos) setDuracao(secondsToInput(sugestao.duracaoSegundos));
    setErrors((current) => ({ ...current, musica: undefined }));

    tomEditadoRef.current = false;
    setTomAutomatico(false);

    if (!sugestao.previewUrl) return;

    setDetectandoTom(true);
    void tomService
      .detectar(sugestao.previewUrl)
      .then((tom) => {
        if (!tom || tomEditadoRef.current) return;
        setTom(tom);
        setTomAutomatico(true);
      })
      .finally(() => setDetectandoTom(false));
  }

  function toggleMusico(id: number) {
    setSelecionados((current) => {
      const next = { ...current };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};

    if (!idBanda) nextErrors.idBanda = "Selecione a banda";
    if (nome.trim().length < 2) nextErrors.musica = "Informe o nome da música";

    const segundos = duracao.trim() ? inputToSeconds(duracao) : null;
    if (duracao.trim() && segundos === null) {
      nextErrors.duracao = "Use o formato mm:ss (ex.: 03:45)";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    const musicosPayload = Object.entries(selecionados).map(([id, funcao]) => ({
      idMusico: Number(id),
      ...(funcao.trim() ? { funcaoMusico: funcao.trim() } : {})
    }));

    setSaving(true);

    try {
      if (mode === "create") {
        await repertoriosService.criar({
          idBanda: Number(idBanda),
          musica: nome.trim(),
          ...(artista.trim() ? { artista: artista.trim() } : {}),
          ...(tom ? { tom } : {}),
          ...(segundos !== null ? { duracaoSegundos: segundos } : {}),
          ...(observacao.trim() ? { observacao: observacao.trim() } : {}),
          ...(musicosPayload.length > 0 ? { musicos: musicosPayload } : {})
        });
        toast.success("Música adicionada", "O repertório da banda foi atualizado.");
      } else if (musica) {
        await repertoriosService.atualizar(musica.idRepertorio, {
          musica: nome.trim(),
          artista: artista.trim() || null,
          tom: tom || null,
          duracaoSegundos: segundos,
          observacao: observacao.trim() || null,
          musicos: musicosPayload
        });
        toast.success("Música atualizada", "As alterações foram salvas.");
      }

      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          musica: error.fields.musica,
          tom: error.fields.tom,
          duracao: error.fields.duracaoSegundos,
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
      title={mode === "create" ? "Adicionar música" : "Editar música"}
      description="Defina tom, duração e as funções de cada músico na execução."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button loading={saving} onClick={() => void handleSubmit()} icon={<Music2 size={16} />}>
            {mode === "create" ? "Adicionar ao repertório" : "Salvar alterações"}
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
          <Field label="Banda" htmlFor="musica-banda" error={errors.idBanda} required>
            <Select
              id="musica-banda"
              value={idBanda}
              disabled={mode === "edit"}
              invalid={Boolean(errors.idBanda)}
              onChange={(event) => {
                setIdBanda(event.target.value);
                setSelecionados({});
              }}
            >
              {lideradas.map((banda) => (
                <option key={banda.idBanda} value={String(banda.idBanda)}>
                  {banda.nome}
                </option>
              ))}
            </Select>
            {mode === "edit" ? (
              <span className="field__hint">A banda não pode ser alterada depois do cadastro.</span>
            ) : null}
          </Field>

          <Field label="Duração (mm:ss)" htmlFor="musica-duracao" error={errors.duracao} hint="Opcional. Usada no cálculo do setlist.">
            <Input
              id="musica-duracao"
              value={duracao}
              placeholder="03:45"
              inputMode="numeric"
              invalid={Boolean(errors.duracao)}
              onChange={(event) => setDuracao(event.target.value)}
            />
          </Field>
        </div>

        <div className="form-grid form-grid--two">
          <Field
            label="Nome da música"
            htmlFor="musica-nome"
            error={errors.musica}
            hint="Digite e escolha uma sugestão para preencher artista, duração e tom."
            required
          >
            <MusicAutocomplete
              id="musica-nome"
              value={nome}
              placeholder="Ex.: Tempo Perdido"
              invalid={Boolean(errors.musica)}
              autoFocus
              onChange={setNome}
              onSelect={aplicarSugestao}
            />
          </Field>

          <Field
            label="Artista"
            htmlFor="musica-artista"
            hint="Usado para buscar a letra no modo ao vivo."
          >
            <Input
              id="musica-artista"
              value={artista}
              placeholder="Ex.: Legião Urbana"
              onChange={(event) => setArtista(event.target.value)}
            />
          </Field>
        </div>

        <div className="form-grid form-grid--two">
          <Field
            label="Tom musical"
            htmlFor="musica-tom"
            error={errors.tom}
            hint={
              detectandoTom
                ? "Analisando a prévia do áudio para estimar o tom…"
                : tomAutomatico
                  ? "Tom estimado a partir da prévia do áudio — confira antes de salvar."
                  : "Escolha uma sugestão acima para o tom ser preenchido automaticamente."
            }
          >
            <Select
              id="musica-tom"
              value={tom}
              onChange={(event) => {
                setTom(event.target.value);
                setTomAutomatico(false);
                tomEditadoRef.current = true;
              }}
            >
              <option value="">Não definido</option>
              {TONS_MUSICAIS.map((tonalidade) => (
                <option key={tonalidade} value={tonalidade}>
                  {tonalidade}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Observações" htmlFor="musica-observacao" hint="Arranjo, referência, pedidos do vocal...">
          <Textarea
            id="musica-observacao"
            rows={2}
            value={observacao}
            placeholder="Detalhes da execução desta música."
            onChange={(event) => setObservacao(event.target.value)}
          />
        </Field>

        <div className="field">
          <span className="field__label">Músicos e funções</span>
          <p className="field__hint">
            Marque quem toca nesta música e descreva a função de cada um. O modo ao vivo usa
            essas informações para avisar as entradas.
          </p>

          {membrosDaBanda.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Banda sem integrantes"
              description="Adicione músicos à banda na página de membros para associá-los ao repertório."
              compact
            />
          ) : (
            <ul className="musician-picker">
              {membrosDaBanda.map((musico) => {
                const incluido = musico.idMusico in selecionados;
                return (
                  <li key={musico.idMusico} className={incluido ? "is-selected" : ""}>
                    <label className="musician-picker__check">
                      <input
                        type="checkbox"
                        checked={incluido}
                        onChange={() => toggleMusico(musico.idMusico)}
                      />
                      <Avatar name={musico.nome} src={musico.fotoPerfil} size="sm" />
                      <span>
                        <strong>{musico.nome}</strong>
                        <span>{musico.cargo}</span>
                      </span>
                    </label>
                    {incluido ? (
                      <Input
                        aria-label={`Função de ${musico.nome}`}
                        value={selecionados[musico.idMusico] ?? ""}
                        placeholder="Função nesta música (ex.: guitarra)"
                        onChange={(event) =>
                          setSelecionados((current) => ({
                            ...current,
                            [musico.idMusico]: event.target.value
                          }))
                        }
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function RepertoirePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const repertoireQuery = useRepertorios();
  const bandsQuery = useBandas();
  const musicosQuery = useMusicos();

  const [busca, setBusca] = useState("");
  const [bandaFilter, setBandaFilter] = useState("all");
  const [tomFilter, setTomFilter] = useState("all");
  const [modal, setModal] = useState<ModalState | null>(null);

  const repertorios = repertoireQuery.data ?? [];
  const bandas = bandsQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];
  const lideradas = ledBands(bandas, user?.idMusico ?? 0);

  const bandaMap = useMemo(
    () => new Map(bandas.map((banda) => [banda.idBanda, banda])),
    [bandas]
  );

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const filtrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    return repertorios.filter((musica) => {
      if (bandaFilter !== "all" && String(musica.idBanda) !== bandaFilter) return false;
      if (tomFilter !== "all" && musica.tom !== tomFilter) return false;
      if (term && !musica.musica.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [repertorios, bandaFilter, tomFilter, busca]);

  const duracaoTotal = filtrados.reduce(
    (total, musica) => total + (musica.duracaoSegundos ?? 0),
    0
  );
  const comDuracao = filtrados.filter((musica) => musica.duracaoSegundos).length;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => repertoriosService.excluir(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.repertorios });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
      toast.success("Música excluída", "Ela saiu do repertório da banda.");
    },
    onError: (error) => toast.error("Não foi possível excluir", mensagemDeErro(error))
  });

  async function handleDelete(musica: Repertorio) {
    const ok = await confirm({
      title: "Excluir música?",
      message: `"${musica.musica}" será removida do repertório. Eventos que usam esta música perderão o vínculo.`,
      confirmLabel: "Excluir",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate(musica.idRepertorio);
  }

  const error = repertoireQuery.error ?? bandsQuery.error ?? musicosQuery.error;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Setlist"
        title="Repertório"
        subtitle="As músicas da banda, com tom, duração e a função de cada músico na execução."
        actions={
          lideradas.length > 0 ? (
            <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
              Adicionar música
            </Button>
          ) : undefined
        }
      />

      {lideradas.length === 0 && repertorios.length > 0 ? (
        <div className="inline-note">
          Você está como músico nestas bandas. Apenas o líder pode adicionar, editar ou excluir músicas.
        </div>
      ) : null}

      <div className="summary-strip">
        <span>
          <strong>{filtrados.length}</strong> {pluralize(filtrados.length, "música", "músicas")}
        </span>
        <span className="summary-strip__dot" />
        <span>
          <Clock size={14} />
          Duração estimada: <strong>{formatTotalDuration(duracaoTotal)}</strong>
        </span>
        <span className="summary-strip__dot" />
        <span>
          {comDuracao} de {filtrados.length} com duração cadastrada
        </span>
      </div>

      <div className="toolbar">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar música..."
          ariaLabel="Buscar música no repertório"
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
            value={tomFilter}
            onChange={(event) => setTomFilter(event.target.value)}
            aria-label="Filtrar por tom"
          >
            <option value="all">Todos os tons</option>
            {TONS_MUSICAIS.map((tonalidade) => (
              <option key={tonalidade} value={tonalidade}>
                {tonalidade}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void repertoireQuery.refetch();
            void bandsQuery.refetch();
            void musicosQuery.refetch();
          }}
        />
      ) : repertoireQuery.isLoading ? (
        <SkeletonRows count={5} />
      ) : repertorios.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="O repertório está em branco"
          description={
            lideradas.length > 0
              ? "Adicione a primeira música para começar a montar o setlist da banda."
              : "Assim que o líder cadastrar músicas, elas aparecem aqui."
          }
          action={
            lideradas.length > 0 ? (
              <Button icon={<Plus size={16} />} onClick={() => setModal({ mode: "create" })}>
                Adicionar música
              </Button>
            ) : undefined
          }
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Nenhuma música encontrada"
          description="Ajuste a busca ou os filtros de banda e tom."
        />
      ) : (
        <section className="card table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Música</th>
                  <th>Tom</th>
                  <th>Duração</th>
                  <th>Músicos e funções</th>
                  <th>Banda</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((musica) => {
                  const banda = bandaMap.get(musica.idBanda);
                  const podeEditar = Boolean(
                    user && banda && banda.idLider === user.idMusico
                  );

                  return (
                    <tr key={musica.idRepertorio}>
                      <td>
                        <div className="song-cell">
                          <span className="song-cell__art">
                            <Music2 size={16} />
                          </span>
                          <div>
                            <strong>{musica.musica}</strong>
                            <span className="song-cell__artist">
                              {musica.artista ?? "Artista não informado"}
                            </span>
                            {musica.observacao ? <span>{musica.observacao}</span> : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={musica.tom ? "yellow" : "neutral"}>
                          {musica.tom ?? "—"}
                        </Badge>
                      </td>
                      <td>{formatDuration(musica.duracaoSegundos)}</td>
                      <td>
                        {musica.musicos.length === 0 ? (
                          <span className="muted">Não definidos</span>
                        ) : (
                          <div className="musician-tags">
                            {musica.musicos.map((item) => {
                              const musico = musicosMap.get(item.idMusico);
                              return (
                                <span key={item.idMusico} className="musician-tag">
                                  <Avatar
                                    name={musico?.nome ?? `Músico ${item.idMusico}`}
                                    src={musico?.fotoPerfil}
                                    size="xs"
                                  />
                                  <span>
                                    {musico?.nome.split(" ")[0] ?? `#${item.idMusico}`}
                                    {item.funcaoMusico ? ` · ${item.funcaoMusico}` : ""}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="band-pill">{banda?.nome ?? `Banda #${musica.idBanda}`}</span>
                      </td>
                      <td>
                        {podeEditar ? (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Editar ${musica.musica}`}
                              onClick={() => setModal({ mode: "edit", musica })}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--danger"
                              aria-label={`Excluir ${musica.musica}`}
                              onClick={() => void handleDelete(musica)}
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
            {filtrados.map((musica) => {
              const banda = bandaMap.get(musica.idBanda);
              const podeEditar = Boolean(user && banda && banda.idLider === user.idMusico);

              return (
                <article key={musica.idRepertorio} className="song-card">
                  <div className="song-card__head">
                    <span className="song-cell__art">
                      <Music2 size={16} />
                    </span>
                    <div>
                      <strong>{musica.musica}</strong>
                      <span>
                        {musica.artista ?? "Artista não informado"} · {banda?.nome}
                      </span>
                    </div>
                    <Badge tone={musica.tom ? "yellow" : "neutral"}>{musica.tom ?? "—"}</Badge>
                  </div>
                  {musica.observacao ? <p>{musica.observacao}</p> : null}
                  <div className="song-card__meta">
                    <span>
                      <Clock size={13} /> {formatDuration(musica.duracaoSegundos)}
                    </span>
                    <span>
                      <Users size={13} /> {musica.musicos.length} músicos
                    </span>
                  </div>
                  {podeEditar ? (
                    <div className="song-card__actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => setModal({ mode: "edit", musica })}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => void handleDelete(musica)}
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
        <SongFormModal
          key={`${modal.mode}-${modal.musica?.idRepertorio ?? "nova"}`}
          mode={modal.mode}
          musica={modal.musica}
          bandas={bandas}
          musicos={musicos}
          idMusico={user?.idMusico ?? 0}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void queryClient.invalidateQueries({ queryKey: queryKeys.repertorios });
            void queryClient.invalidateQueries({ queryKey: queryKeys.eventos });
          }}
        />
      ) : null}
    </div>
  );
}

