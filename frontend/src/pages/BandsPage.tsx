import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ListMusic,
  Mic2,
  Music2,
  Plus,
  Search,
  Ticket,
  UserPlus,
  Users
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { Field, Input, Textarea } from "../components/ui/Field";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SkeletonCards } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
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
import { initials, pluralize } from "../lib/format";
import { bandRole } from "../lib/permissions";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Banda } from "../types/api";

type ModalKind = "create" | "join" | null;

export function BandsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const bandsQuery = useBandas();
  const musicosQuery = useMusicos();
  const repertoriosQuery = useRepertorios();
  const eventosQuery = useEventos();
  const ensaiosQuery = useEnsaios();
  const equipamentosQuery = useEquipamentos();

  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);

  const bandas = bandsQuery.data ?? [];
  const musicos = musicosQuery.data ?? [];
  const repertorios = repertoriosQuery.data ?? [];
  const eventos = eventosQuery.data ?? [];
  const ensaios = ensaiosQuery.data ?? [];
  const equipamentos = equipamentosQuery.data ?? [];

  const musicosMap = useMemo(
    () => new Map(musicos.map((musico) => [musico.idMusico, musico])),
    [musicos]
  );

  const filtradas = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return bandas;
    return bandas.filter((banda) =>
      `${banda.nome} ${banda.descricao ?? ""}`.toLowerCase().includes(term)
    );
  }, [bandas, busca]);

  const error =
    bandsQuery.error ??
    musicosQuery.error ??
    repertoriosQuery.error ??
    eventosQuery.error ??
    ensaiosQuery.error ??
    equipamentosQuery.error;

  function countsFor(idBanda: number) {
    return {
      membros: new Set(
        [bandas.find((banda) => banda.idBanda === idBanda)?.idLider ?? 0].concat(
          bandas.find((banda) => banda.idBanda === idBanda)?.idMembros ?? []
        )
      ).size,
      repertorios: repertorios.filter((item) => item.idBanda === idBanda).length,
      eventos: eventos.filter((item) => item.idBanda === idBanda).length,
      ensaios: ensaios.filter((item) => item.idBanda === idBanda).length,
      equipamentos: equipamentos.filter((item) => item.idBanda === idBanda).length
    };
  }

  function handleCreated(banda: Banda) {
    setModal(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.bandas });
    toast.success("Banda criada!", `${banda.nome} já está no seu palco.`);
    navigate(`/bandas/${banda.idBanda}`);
  }

  function handleJoined(banda: Banda) {
    setModal(null);
    void queryClient.invalidateQueries();
    toast.success("Você entrou na banda!", `Bem-vindo à ${banda.nome}.`);
    navigate(`/bandas/${banda.idBanda}`);
  }

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Seu coletivo"
        title="Minhas bandas"
        subtitle="Cada banda tem seu próprio repertório, agenda, equipamentos e identidade."
        actions={
          <>
            <Button variant="outline" icon={<UserPlus size={16} />} onClick={() => setModal("join")}>
              Entrar com código
            </Button>
            <Button icon={<Plus size={16} />} onClick={() => setModal("create")}>
              Nova banda
            </Button>
          </>
        }
      />

      <div className="toolbar toolbar--simple">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar banda..."
          ariaLabel="Buscar banda"
        />
        <span className="toolbar__count">
          {bandas.length} {pluralize(bandas.length, "banda", "bandas")}
        </span>
      </div>

      {error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void bandsQuery.refetch();
            void musicosQuery.refetch();
            void repertoriosQuery.refetch();
            void eventosQuery.refetch();
            void ensaiosQuery.refetch();
          }}
        />
      ) : bandsQuery.isLoading ? (
        <SkeletonCards count={3} />
      ) : bandas.length === 0 ? (
        <div className="card onboarding-card">
          <span className="onboarding-card__icon">
            <Music2 size={28} />
          </span>
          <h2>Seu primeiro palco começa aqui.</h2>
          <p>
            Crie uma banda para organizar repertório, ensaios e eventos — ou entre em uma
            banda existente usando o código de convite do líder.
          </p>
          <div className="onboarding-card__actions">
            <Button icon={<Plus size={16} />} onClick={() => setModal("create")}>
              Criar minha banda
            </Button>
            <Button variant="outline" icon={<Search size={16} />} onClick={() => setModal("join")}>
              Tenho um código
            </Button>
          </div>
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhuma banda encontrada"
          description="Tente outro termo ou cadastre uma nova banda."
        />
      ) : (
        <div className="band-grid">
          {filtradas.map((banda, index) => {
            const counts = countsFor(banda.idBanda);
            const lider = musicosMap.get(banda.idLider);
            const membros = [banda.idLider, ...banda.idMembros.filter((id) => id !== banda.idLider)];

            return (
              <Link
                key={banda.idBanda}
                to={`/bandas/${banda.idBanda}`}
                className={`band-card band-card--tone-${(index % 4) + 1}`}
              >
                <div className="band-card__cover">
                  <span className="band-card__initials" aria-hidden="true">
                    {initials(banda.nome)}
                  </span>
                  <Badge tone={bandRole(banda, user?.idMusico ?? 0) === "lider" ? "yellow" : "purple"}>
                    {bandRole(banda, user?.idMusico ?? 0) === "lider" ? "Você é líder" : "Integrante"}
                  </Badge>
                  <span className="band-card__wave" aria-hidden="true">
                    <Music2 size={64} />
                  </span>
                </div>

                <div className="band-card__body">
                  <div className="band-card__title-row">
                    <h2>{banda.nome}</h2>
                    <ArrowRight size={18} />
                  </div>
                  <p>{banda.descricao?.trim() || "Sem descrição cadastrada."}</p>

                  <div className="band-card__leader">
                    <Avatar
                      name={lider?.nome ?? "Líder"}
                      src={lider?.fotoPerfil}
                      size="xs"
                    />
                    <span>
                      Líder: <strong>{lider?.nome ?? "—"}</strong>
                    </span>
                  </div>

                  <div className="band-card__stats">
                    <span>
                      <Users size={14} />
                      {counts.membros} {pluralize(counts.membros, "músico", "músicos")}
                    </span>
                    <span>
                      <ListMusic size={14} />
                      {counts.repertorios} {pluralize(counts.repertorios, "música", "músicas")}
                    </span>
                    <span>
                      <Ticket size={14} />
                      {counts.eventos} {pluralize(counts.eventos, "evento", "eventos")}
                    </span>
                    <span>
                      <Mic2 size={14} />
                      {counts.ensaios} {pluralize(counts.ensaios, "ensaio", "ensaios")}
                    </span>
                  </div>

                  <div className="band-card__members">
                    {membros.slice(0, 5).map((id) => {
                      const musico = musicosMap.get(id);
                      return (
                        <Avatar
                          key={id}
                          name={musico?.nome ?? `Músico ${id}`}
                          src={musico?.fotoPerfil}
                          size="xs"
                        />
                      );
                    })}
                    {membros.length > 5 ? (
                      <span className="band-card__more">+{membros.length - 5}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {bandas.length > 0 ? (
        <section className="card band-tip">
          <CalendarDays size={20} />
          <div>
            <strong>Dica de líder</strong>
            <p>
              Compartilhe o código de convite na página da banda para trazer novos músicos.
              Cada integrante vê a agenda, o repertório e os equipamentos da banda.
            </p>
          </div>
        </section>
      ) : null}

      {modal === "create" ? (
        <CreateBandModal
          idMusico={user?.idMusico ?? 0}
          onClose={() => setModal(null)}
          onCreated={handleCreated}
        />
      ) : null}

      {modal === "join" ? (
        <JoinBandModal onClose={() => setModal(null)} onJoined={handleJoined} />
      ) : null}
    </div>
  );
}

interface CreateBandModalProps {
  idMusico: number;
  onClose: () => void;
  onCreated: (banda: Banda) => void;
}

function CreateBandModal({ idMusico, onClose, onCreated }: CreateBandModalProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errors, setErrors] = useState<{ nome?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      bandasService.criar({
        nome: nome.trim(),
        ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
        idLider: idMusico
      }),
    onSuccess: (response) => onCreated(response.banda),
    onError: (error) => {
      if (error instanceof ApiError) setErrors({ nome: error.fields.nome });
      setFormError(mensagemDeErro(error));
    }
  });

  function submit() {
    setFormError(null);
    if (nome.trim().length < 2) {
      setErrors({ nome: "Informe um nome com pelo menos 2 caracteres" });
      return;
    }
    setErrors({});
    mutation.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova banda"
      description="Você será o líder e poderá gerenciar membros, repertório, agenda e equipamentos."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={submit} icon={<Plus size={16} />}>
            Criar banda
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

        <Field label="Nome da banda" htmlFor="banda-nome" error={errors.nome} required>
          <Input
            id="banda-nome"
            data-autofocus
            value={nome}
            invalid={Boolean(errors.nome)}
            placeholder="Ex.: Aurora Elétrica"
            onChange={(event) => setNome(event.target.value)}
          />
        </Field>

        <Field label="Descrição" htmlFor="banda-descricao" hint="Opcional. Estilo, formação, história...">
          <Textarea
            id="banda-descricao"
            rows={3}
            value={descricao}
            placeholder="Conte um pouco sobre a banda."
            onChange={(event) => setDescricao(event.target.value)}
          />
        </Field>

        <div className="inline-note">
          O código de convite é gerado automaticamente pelo BeatStage depois da criação.
        </div>
      </div>
    </Modal>
  );
}

interface JoinBandModalProps {
  onClose: () => void;
  onJoined: (banda: Banda) => void;
}

function JoinBandModal({ onClose, onJoined }: JoinBandModalProps) {
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => bandasService.entrar(codigo.trim().toUpperCase()),
    onSuccess: (response) => onJoined(response.banda),
    onError: (err) => setError(mensagemDeErro(err))
  });

  function submit() {
    setError(null);
    if (codigo.trim().length === 0) {
      setError("Informe o código de convite");
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Entrar com código"
      description="Peça o código de convite ao líder da banda. Ele tem 8 caracteres."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={submit} icon={<UserPlus size={16} />}>
            Entrar na banda
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

        <Field label="Código de convite" htmlFor="codigo-convite" required>
          <Input
            id="codigo-convite"
            data-autofocus
            value={codigo}
            maxLength={20}
            placeholder="EX.: AURORA24"
            className="input--code"
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </Field>
        <p className="muted small">
          Ao entrar, você passa a ver a agenda, o repertório e os equipamentos desta banda.
        </p>
      </div>
    </Modal>
  );
}
