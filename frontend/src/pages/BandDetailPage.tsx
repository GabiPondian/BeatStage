import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Crown,
  Guitar,
  ListMusic,
  Mail,
  Mic2,
  Music2,
  Pencil,
  Plus,
  ShieldCheck,
  Speaker,
  Trash2,
  UserMinus,
  UserPlus,
  Users
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Select, Textarea } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { SearchInput } from "../components/ui/SearchInput";
import { StatCard } from "../components/ui/StatCard";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  useBandas,
  useEnsaios,
  useEquipamentos,
  useEventos,
  useMusicos,
  useRepertorios,
  queryKeys
} from "../hooks/queries";
import { bandasService } from "../services/bandas.service";
import {
  formatDateShort,
  isPastDate,
  initials,
  pluralize,
  sortByDateAndTime
} from "../lib/format";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Banda, Musico } from "../types/api";

export function BandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const idBanda = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();

  const bandsQuery = useBandas();
  const musicosQuery = useMusicos();
  const repertoriosQuery = useRepertorios();
  const eventosQuery = useEventos();
  const ensaiosQuery = useEnsaios();
  const equipamentosQuery = useEquipamentos();

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const banda = bandsQuery.data?.find((item) => item.idBanda === idBanda);
  const musicos = musicosQuery.data ?? [];
  const repertorios = repertoriosQuery.data ?? [];
  const eventos = eventosQuery.data ?? [];
  const ensaios = ensaiosQuery.data ?? [];
  const equipamentos = equipamentosQuery.data ?? [];

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const isLider = Boolean(banda && user && banda.idLider === user.idMusico);
  const membros = useMemo(() => {
    if (!banda) return [];
    return Array.from(new Set([banda.idLider, ...banda.idMembros]));
  }, [banda]);

  const deleteMutation = useMutation({
    mutationFn: () => bandasService.excluir(idBanda),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Banda excluída", "Os dados relacionados foram arquivados.");
      navigate("/bandas", { replace: true });
    },
    onError: (error) => toast.error("Não foi possível excluir a banda", mensagemDeErro(error))
  });

  const removeMutation = useMutation({
    mutationFn: (idMusico: number) => {
      if (!banda) throw new Error("Banda não carregada");
      return bandasService.atualizar(banda.idBanda, {
        idMembros: banda.idMembros.filter((membro) => membro !== idMusico)
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bandas });
      toast.success("Integrante removido", "A lista de membros foi atualizada.");
    },
    onError: (error) => toast.error("Não foi possível remover", mensagemDeErro(error))
  });

  if (bandsQuery.isLoading) {
    return (
      <div className="stack">
        <Skeleton className="skeleton--line skeleton--w30" />
        <Skeleton className="skeleton--block" />
      </div>
    );
  }

  if (bandsQuery.isError) {
    return <ErrorState error={bandsQuery.error} onRetry={() => void bandsQuery.refetch()} />;
  }

  if (!banda) {
    return (
      <EmptyState
        icon={Music2}
        title="Banda não encontrada"
        description="Ela pode ter sido excluída ou você não participa mais dela."
        action={
          <Link to="/bandas" className="btn btn--primary btn--md">
            <span>Voltar para minhas bandas</span>
          </Link>
        }
      />
    );
  }

  const lider = musicosMap.get(banda.idLider);
  const membrosInfo = membros.map((idMusico) => ({
    id: idMusico,
    musico: musicosMap.get(idMusico),
    isLider: idMusico === banda.idLider
  }));

  const proximosEventos = sortByDateAndTime(
    eventos.filter((evento) => evento.idBanda === idBanda && !isPastDate(evento.data))
  ).slice(0, 3);

  const proximosEnsaios = sortByDateAndTime(
    ensaios.filter((ensaio) => ensaio.idBanda === idBanda && !isPastDate(ensaio.data))
  ).slice(0, 3);

  const repertorioBanda = repertorios.filter((item) => item.idBanda === idBanda);
  const equipamentosBanda = equipamentos.filter((item) => item.idBanda === idBanda);

  async function copyCode() {
    if (!banda) return;
    try {
      await navigator.clipboard.writeText(banda.codigoConvite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Código copiado", "Compartilhe com os músicos da banda.");
    } catch {
      toast.error("Não foi possível copiar", "Selecione o código manualmente.");
    }
  }

  async function handleRemove(musico: Musico) {
    const ok = await confirm({
      title: "Remover integrante?",
      message: `${musico.nome} deixará de ver a agenda, o repertório e os equipamentos desta banda.`,
      confirmLabel: "Remover",
      tone: "danger"
    });
    if (ok) removeMutation.mutate(musico.idMusico);
  }

  async function handleDeleteBand() {
    if (!banda) return;
    const ok = await confirm({
      title: "Excluir a banda?",
      message: `"${banda.nome}", seus ensaios, eventos, repertórios, equipamentos e feedbacks serão arquivados. Esta ação afeta todos os integrantes.`,
      confirmLabel: "Excluir banda",
      tone: "danger"
    });
    if (ok) deleteMutation.mutate();
  }

  return (
    <div className="stack stack--lg">
      <PageHeader
        backTo="/bandas"
        backLabel="Minhas bandas"
        eyebrow={isLider ? "Você lidera esta banda" : "Você participa desta banda"}
        title={banda.nome}
        subtitle={banda.descricao?.trim() || "Sem descrição cadastrada."}
        actions={
          isLider ? (
            <>
              <Button variant="outline" icon={<Pencil size={16} />} onClick={() => setEditOpen(true)}>
                Editar banda
              </Button>
              <Button icon={<UserPlus size={16} />} onClick={() => setAddOpen(true)}>
                Adicionar membro
              </Button>
            </>
          ) : undefined
        }
      />

      <section className="band-hero">
        <div className="band-hero__art" aria-hidden="true">
          <span>{initials(banda.nome)}</span>
          <Music2 size={80} />
        </div>
        <div className="band-hero__info">
          <div className="band-hero__badges">
            <Badge tone={isLider ? "yellow" : "purple"}>{isLider ? "Líder" : "Integrante"}</Badge>
            <Badge tone="outline">{membros.length} integrantes</Badge>
          </div>
          <div className="band-hero__leader">
            <Avatar name={lider?.nome ?? "Líder"} src={lider?.fotoPerfil} size="md" />
            <div>
              <span>Liderada por</span>
              <strong>{lider?.nome ?? "—"}</strong>
              {lider?.cargo ? <small>{lider.cargo}</small> : null}
            </div>
          </div>
        </div>
        <div className="band-hero__actions">
          <Link to="/repertorio" className="btn btn--ghost btn--sm">
            <ListMusic size={15} />
            <span>Repertório</span>
          </Link>
          <Link to="/agenda" className="btn btn--ghost btn--sm">
            <CalendarDays size={15} />
            <span>Agenda</span>
          </Link>
          {isLider ? (
            <button
              type="button"
              className="btn btn--danger-ghost btn--sm"
              onClick={() => void handleDeleteBand()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={15} />
              <span>Excluir</span>
            </button>
          ) : null}
        </div>
      </section>

      <section className="stat-grid stat-grid--four">
        <StatCard icon={Users} label="Integrantes" value={membros.length} tone="purple" />
        <StatCard icon={ListMusic} label="Músicas" value={repertorioBanda.length} tone="yellow" />
        <StatCard icon={Guitar} label="Eventos" value={eventos.filter((e) => e.idBanda === idBanda).length} tone="green" />
        <StatCard icon={Speaker} label="Equipamentos" value={equipamentosBanda.length} tone="pink" />
      </section>

      <div className="band-detail-grid">
        <section className="card band-members">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Formação</span>
              <h2>Integrantes</h2>
            </div>
            {isLider ? (
              <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                Adicionar
              </Button>
            ) : null}
          </header>

          <ul className="member-list">
            {membrosInfo.map(({ id: idMusico, musico, isLider: membroLider }) => (
              <li key={idMusico} className="member-row">
                <Avatar
                  name={musico?.nome ?? `Músico ${idMusico}`}
                  src={musico?.fotoPerfil}
                  size="md"
                />
                <div className="member-row__body">
                  <div className="member-row__name">
                    <strong>{musico?.nome ?? `Músico #${idMusico}`}</strong>
                    {membroLider ? (
                      <Badge tone="yellow">
                        <Crown size={12} /> Líder
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Integrante</Badge>
                    )}
                  </div>
                  <span>{musico?.cargo || "Função não informada"}</span>
                  {isLider && musico?.email ? (
                    <span className="member-row__email">
                      <Mail size={13} /> {musico.email}
                    </span>
                  ) : null}
                </div>
                {isLider && !membroLider ? (
                  <div className="member-row__actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Transferir liderança"
                      aria-label={`Transferir liderança para ${musico?.nome ?? ""}`}
                      onClick={() => setTransferOpen(true)}
                    >
                      <ShieldCheck size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      title="Remover integrante"
                      aria-label={`Remover ${musico?.nome ?? ""}`}
                      onClick={() => musico && void handleRemove(musico)}
                      disabled={removeMutation.isPending}
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <aside className="stack">
          {isLider ? (
            <section className="card invite-card">
              <span className="eyebrow">Convite</span>
              <h2>Código da banda</h2>
              <p>Compartilhe este código para novos músicos entrarem na banda.</p>
              <div className="invite-code">
                <code>{banda.codigoConvite}</code>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void copyCode()}
                  aria-label="Copiar código de convite"
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>
              <span className="invite-card__hint">
                O código é gerado pelo BeatStage e não pode ser editado.
              </span>
            </section>
          ) : (
            <section className="card invite-card invite-card--locked">
              <span className="invite-card__lock">
                <ShieldCheck size={20} />
              </span>
              <h2>Convite protegido</h2>
              <p>Apenas o líder pode ver e compartilhar o código desta banda.</p>
            </section>
          )}

          <section className="card band-quick">
            <h2>Atalhos</h2>
            <Link to="/repertorio">
              <ListMusic size={16} />
              <span>Repertório</span>
              <strong>{repertorioBanda.length}</strong>
              <ArrowRight size={14} />
            </Link>
            <Link to="/ensaios">
              <Mic2 size={16} />
              <span>Ensaios</span>
              <strong>{ensaios.filter((item) => item.idBanda === idBanda).length}</strong>
              <ArrowRight size={14} />
            </Link>
            <Link to="/eventos">
              <Guitar size={16} />
              <span>Eventos</span>
              <strong>{eventos.filter((item) => item.idBanda === idBanda).length}</strong>
              <ArrowRight size={14} />
            </Link>
            <Link to="/equipamentos">
              <Speaker size={16} />
              <span>Equipamentos</span>
              <strong>{equipamentosBanda.length}</strong>
              <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>

      <div className="band-detail-grid band-detail-grid--even">
        <section className="card">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Na estrada</span>
              <h2>Próximos compromissos</h2>
            </div>
          </header>
          {proximosEventos.length === 0 && proximosEnsaios.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sem compromissos marcados"
              description="Ensaios e eventos desta banda aparecerão aqui."
              compact
            />
          ) : (
            <ul className="simple-list">
              {[...proximosEventos.map((evento) => ({ ...evento, kind: "Evento" as const })), ...proximosEnsaios.map((ensaio) => ({ ...ensaio, kind: "Ensaio" as const }))]
                .sort((a, b) => a.data.localeCompare(b.data))
                .map((item) => (
                  <li key={`${item.kind}-${"idEvento" in item ? item.idEvento : item.idEnsaio}`}>
                    <span className="simple-list__date">{formatDateShort(item.data)}</span>
                    <div>
                      <strong>
                        {"nome" in item ? item.nome : item.descricao?.trim() || "Ensaio da banda"}
                      </strong>
                      <span>{item.local || "Local a definir"}</span>
                    </div>
                    <Badge tone={item.kind === "Evento" ? "yellow" : "purple"}>{item.kind}</Badge>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="card">
          <header className="panel-head">
            <div>
              <span className="eyebrow">Setlist</span>
              <h2>Repertório</h2>
            </div>
            <Link to="/repertorio" className="panel-head__link">
              Ver tudo <ArrowRight size={14} />
            </Link>
          </header>
          {repertorioBanda.length === 0 ? (
            <EmptyState
              icon={ListMusic}
              title="Nenhuma música ainda"
              description={
                isLider
                  ? "Adicione músicas e defina tom e funções dos músicos."
                  : "O líder ainda não cadastrou músicas para esta banda."
              }
              compact
            />
          ) : (
            <ul className="song-preview">
              {repertorioBanda.slice(0, 4).map((musica) => (
                <li key={musica.idRepertorio}>
                  <span className="song-preview__tom">{musica.tom ?? "—"}</span>
                  <div>
                    <strong>{musica.musica}</strong>
                    <span>
                      {musica.musicos.length > 0
                        ? `${musica.musicos.length} ${pluralize(musica.musicos.length, "músico", "músicos")}`
                        : "Sem músicos definidos"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editOpen ? (
        <EditBandModal banda={banda} onClose={() => setEditOpen(false)} />
      ) : null}

      {addOpen ? (
        <AddMemberModal
          banda={banda}
          musicos={musicos}
          onClose={() => setAddOpen(false)}
        />
      ) : null}

      {transferOpen ? (
        <TransferLeadershipModal
          banda={banda}
          musicos={musicos.filter((musico) => membros.includes(musico.idMusico) && musico.idMusico !== banda.idLider)}
          onClose={() => setTransferOpen(false)}
        />
      ) : null}
    </div>
  );
}

function EditBandModal({ banda, onClose }: { banda: Banda; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [nome, setNome] = useState(banda.nome);
  const [descricao, setDescricao] = useState(banda.descricao ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      bandasService.atualizar(banda.idBanda, {
        nome: nome.trim(),
        descricao: descricao.trim() || null
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bandas });
      toast.success("Banda atualizada", "As informações foram salvas.");
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.fields.nome ?? mensagemDeErro(err));
      else setError(mensagemDeErro(err));
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar banda"
      description="Atualize o nome e a descrição que os integrantes veem."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => {
              setError(null);
              if (nome.trim().length < 2) {
                setError("O nome deve ter pelo menos 2 caracteres");
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
        <Field label="Nome da banda" htmlFor="editar-banda-nome" required>
          <Input
            id="editar-banda-nome"
            data-autofocus
            value={nome}
            onChange={(event) => setNome(event.target.value)}
          />
        </Field>
        <Field label="Descrição" htmlFor="editar-banda-descricao">
          <Textarea
            id="editar-banda-descricao"
            rows={3}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AddMemberModal({
  banda,
  musicos,
  onClose
}: {
  banda: Banda;
  musicos: Musico[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const atuais = new Set([banda.idLider, ...banda.idMembros]);
  const disponiveis = musicos.filter(
    (musico) =>
      !atuais.has(musico.idMusico) &&
      `${musico.nome} ${musico.cargo}`.toLowerCase().includes(busca.trim().toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: () =>
      bandasService.atualizar(banda.idBanda, {
        idMembros: [...banda.idMembros, ...selected]
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bandas });
      toast.success("Integrantes adicionados", "Eles já podem acessar a banda.");
      onClose();
    },
    onError: (err) => setError(mensagemDeErro(err))
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Adicionar integrantes"
      description="Selecione músicos já cadastrados no BeatStage. Eles passam a ver os dados desta banda."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            loading={mutation.isPending}
            onClick={() => {
              setError(null);
              if (selected.length === 0) {
                setError("Selecione pelo menos um músico");
                return;
              }
              mutation.mutate();
            }}
            icon={<UserPlus size={16} />}
          >
            Adicionar {selected.length > 0 ? `(${selected.length})` : ""}
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

        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar músico por nome ou função..."
          ariaLabel="Buscar músico"
        />

        {disponiveis.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum músico disponível"
            description="Todos os músicos cadastrados já estão nesta banda."
            compact
          />
        ) : (
          <ul className="picker-list">
            {disponiveis.map((musico) => {
              const checked = selected.includes(musico.idMusico);
              return (
                <li key={musico.idMusico}>
                  <label className={`picker-row ${checked ? "is-selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((current) =>
                          checked
                            ? current.filter((id) => id !== musico.idMusico)
                            : [...current, musico.idMusico]
                        )
                      }
                    />
                    <Avatar name={musico.nome} src={musico.fotoPerfil} size="sm" />
                    <span className="picker-row__body">
                      <strong>{musico.nome}</strong>
                      <span>{musico.cargo}</span>
                    </span>
                    {checked ? <Check size={16} /> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function TransferLeadershipModal({
  banda,
  musicos,
  onClose
}: {
  banda: Banda;
  musicos: Musico[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [novoLider, setNovoLider] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (idMusico: number) =>
      bandasService.atualizar(banda.idBanda, {
        idLider: idMusico,
        idMembros: Array.from(
          new Set([...banda.idMembros.filter((id) => id !== idMusico), banda.idLider])
        )
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      toast.success("Liderança transferida", "Você agora é integrante da banda.");
      onClose();
    },
    onError: (err) => setError(mensagemDeErro(err))
  });

  async function submit() {
    setError(null);
    if (!novoLider) {
      setError("Selecione o novo líder");
      return;
    }

    const novo = musicos.find((musico) => musico.idMusico === Number(novoLider));
    const ok = await confirm({
      title: "Transferir liderança?",
      message: `${novo?.nome ?? "Este músico"} passará a gerenciar a banda. Você continuará como integrante e não poderá desfazer a ação sozinho.`,
      confirmLabel: "Transferir",
      tone: "danger"
    });

    if (ok) mutation.mutate(Number(novoLider));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Transferir liderança"
      description="O novo líder poderá editar a banda, membros, eventos, ensaios, repertório e equipamentos."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="danger" loading={mutation.isPending} onClick={() => void submit()} icon={<Crown size={16} />}>
            Transferir
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
        <Field label="Novo líder" htmlFor="novo-lider" required>
          <Select
            id="novo-lider"
            data-autofocus
            value={novoLider}
            onChange={(event) => setNovoLider(event.target.value)}
          >
            <option value="">Selecione um integrante...</option>
            {musicos.map((musico) => (
              <option key={musico.idMusico} value={String(musico.idMusico)}>
                {musico.nome} · {musico.cargo}
              </option>
            ))}
          </Select>
        </Field>
        <p className="muted small">
          Esta ação não pode ser desfeita por você. O novo líder poderá devolver a liderança depois.
        </p>
      </div>
    </Modal>
  );
}
