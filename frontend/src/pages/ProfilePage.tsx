import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Crown,
  KeyRound,
  Mail,
  Music2,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Modal } from "../components/ui/Modal";
import { Field, Input } from "../components/ui/Field";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  useBandas,
  useEventos,
  useRepertorios,
  queryKeys
} from "../hooks/queries";
import { musicosService } from "../services/musicos.service";
import { ledBands } from "../lib/permissions";
import { pluralize } from "../lib/format";
import { ApiError, mensagemDeErro } from "../lib/api";
import type { Musico } from "../types/api";

export function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const bandsQuery = useBandas();
  const eventsQuery = useEventos();
  const repertoireQuery = useRepertorios();

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const bandas = bandsQuery.data ?? [];
  const eventos = eventsQuery.data ?? [];
  const repertorios = repertoireQuery.data ?? [];

  const lideradas = useMemo(
    () => (user ? ledBands(bandas, user.idMusico) : []),
    [bandas, user]
  );

  const inactivateMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Sessão expirada");
      return musicosService.inativar(user.idMusico);
    },
    onSuccess: () => {
      queryClient.clear();
      logout();
      toast.success("Perfil inativado", "Sua conta não poderá mais acessar o BeatStage.");
      navigate("/login", { replace: true });
    },
    onError: (error) => {
      toast.error("Não foi possível inativar o perfil", mensagemDeErro(error));
    }
  });

  async function handleInactivate() {
    const ok = await confirm({
      title: "Inativar seu perfil?",
      message:
        "Você deixará de acessar o BeatStage. Seus dados históricos permanecem no sistema. Se você lidera uma banda ativa, transfira a liderança ou exclua a banda antes.",
      confirmLabel: "Inativar perfil",
      tone: "danger"
    });

    if (ok) inactivateMutation.mutate();
  }

  if (!user) return null;

  return (
    <div className="stack stack--lg">
      <PageHeader
        eyebrow="Sua identidade"
        title="Meu perfil"
        subtitle="Seus dados de músico, segurança da conta e preferências de participação."
        actions={
          <Button variant="outline" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
            Editar perfil
          </Button>
        }
      />

      <div className="profile-grid">
        <section className="card profile-card">
          <div className="profile-card__cover" aria-hidden="true" />
          <div className="profile-card__avatar">
            <Avatar name={user.nome} src={user.fotoPerfil} size="xl" />
          </div>
          <div className="profile-card__body">
            <Badge tone={lideradas.length > 0 ? "yellow" : "purple"}>
              {lideradas.length > 0 ? <Crown size={12} /> : <UserRound size={12} />}
              {lideradas.length > 0 ? "Líder de banda" : "Músico"}
            </Badge>
            <h2>{user.nome}</h2>
            <p className="profile-card__cargo">{user.cargo || "Função não informada"}</p>
            <span className="profile-card__email">
              <Mail size={14} /> {user.email}
            </span>

            <div className="profile-card__stats">
              <div>
                <strong>{bandas.length}</strong>
                <span>{pluralize(bandas.length, "banda", "bandas")}</span>
              </div>
              <div>
                <strong>{repertorios.length}</strong>
                <span>{pluralize(repertorios.length, "música", "músicas")}</span>
              </div>
              <div>
                <strong>{eventos.length}</strong>
                <span>{pluralize(eventos.length, "evento", "eventos")}</span>
              </div>
            </div>

            <Button fullWidth variant="ghost" icon={<Pencil size={15} />} onClick={() => setEditOpen(true)}>
              Editar informações
            </Button>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Dados pessoais</span>
                <h2>Informações da conta</h2>
              </div>
              <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => setEditOpen(true)}>
                Editar
              </Button>
            </header>

            <dl className="profile-info">
              <div>
                <dt>Nome completo</dt>
                <dd>{user.nome}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Função musical</dt>
                <dd>{user.cargo || "Não informada"}</dd>
              </div>
              <div>
                <dt>Identificador</dt>
                <dd>#{user.idMusico}</dd>
              </div>
            </dl>

            {lideradas.length > 0 ? (
              <div className="profile-bands">
                <span className="field__label">Bandas que você lidera</span>
                <div className="profile-bands__list">
                  {lideradas.map((banda) => (
                    <span key={banda.idBanda} className="band-pill band-pill--leader">
                      <Crown size={12} /> {banda.nome}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="card">
            <header className="panel-head">
              <div>
                <span className="eyebrow">Segurança</span>
                <h2>Senha e sessão</h2>
              </div>
              <ShieldCheck size={20} className="muted" />
            </header>
            <div className="security-row">
              <span className="security-row__icon">
                <KeyRound size={18} />
              </span>
              <div>
                <strong>Senha de acesso</strong>
                <p>Use pelo menos 8 caracteres e não compartilhe com ninguém.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                Alterar senha
              </Button>
            </div>
            <div className="security-row">
              <span className="security-row__icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>Sessão protegida por token</strong>
                <p>
                  O BeatStage usa autenticação Bearer com validade de 1 hora. Ao expirar,
                  você precisará entrar novamente.
                </p>
              </div>
            </div>
          </section>

          <section className="card danger-zone">
            <div className="danger-zone__head">
              <span className="danger-zone__icon">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h2>Inativar perfil</h2>
                <p>
                  A conta é desativada (exclusão lógica) e você perde o acesso. Se liderar
                  uma banda ativa, resolva a liderança antes.
                </p>
              </div>
            </div>
            <Button
              variant="danger-ghost"
              icon={<Trash2 size={15} />}
              loading={inactivateMutation.isPending}
              onClick={() => void handleInactivate()}
            >
              Inativar minha conta
            </Button>
          </section>
        </div>
      </div>

      {editOpen ? (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={(musico) => {
            updateUser(musico);
            setEditOpen(false);
            void queryClient.invalidateQueries({ queryKey: queryKeys.musicos });
          }}
        />
      ) : null}

      {passwordOpen ? <PasswordModal onClose={() => setPasswordOpen(false)} /> : null}
    </div>
  );
}

function EditProfileModal({
  user,
  onClose,
  onSaved
}: {
  user: Musico;
  onClose: () => void;
  onSaved: (musico: Musico) => void;
}) {
  const toast = useToast();
  const [nome, setNome] = useState(user.nome);
  const [email, setEmail] = useState(user.email);
  const [cargo, setCargo] = useState(user.cargo);
  const [fotoPerfil, setFotoPerfil] = useState(user.fotoPerfil ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      musicosService.atualizarPerfil({
        nome: nome.trim(),
        email: email.trim(),
        cargo: cargo.trim(),
        fotoPerfil: fotoPerfil.trim() || null
      }),
    onSuccess: (response) => {
      toast.success("Perfil atualizado", "Suas informações foram salvas.");
      onSaved(response.musico);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setErrors({
          nome: error.fields.nome,
          email: error.fields.email,
          cargo: error.fields.cargo,
          fotoPerfil: error.fields.fotoPerfil
        });
      }
      setFormError(mensagemDeErro(error));
    }
  });

  function submit() {
    setFormError(null);
    const nextErrors: Record<string, string> = {};
    if (nome.trim().length < 2) nextErrors.nome = "Informe seu nome";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Informe um e-mail válido";
    }
    if (cargo.trim().length < 2) nextErrors.cargo = "Informe sua função musical";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    mutation.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar perfil"
      description="Esses dados aparecem para os integrantes das suas bandas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={submit} icon={<Check size={16} />}>
            Salvar alterações
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

        <div className="profile-photo-row">
          <Avatar name={nome || user.nome} src={fotoPerfil || null} size="lg" />
          <div className="profile-photo-row__field">
            <Field
              label="Foto de perfil (URL)"
              htmlFor="perfil-foto"
              error={errors.fotoPerfil}
              hint="Deixe em branco para usar as iniciais."
            >
              <Input
                id="perfil-foto"
                type="url"
                value={fotoPerfil}
                placeholder="https://..."
                invalid={Boolean(errors.fotoPerfil)}
                onChange={(event) => setFotoPerfil(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field label="Nome completo" htmlFor="perfil-nome" error={errors.nome} required>
          <Input
            id="perfil-nome"
            data-autofocus
            value={nome}
            invalid={Boolean(errors.nome)}
            onChange={(event) => setNome(event.target.value)}
          />
        </Field>

        <Field label="E-mail" htmlFor="perfil-email" error={errors.email} required>
          <Input
            id="perfil-email"
            type="email"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Função musical" htmlFor="perfil-cargo" error={errors.cargo} required>
          <Input
            id="perfil-cargo"
            value={cargo}
            invalid={Boolean(errors.cargo)}
            onChange={(event) => setCargo(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      musicosService.alterarSenha({
        senhaAtual,
        novaSenha
      }),
    onSuccess: () => {
      toast.success("Senha alterada", "Use a nova senha no próximo acesso.");
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fields.novaSenha) setError(err.fields.novaSenha);
      else setError(mensagemDeErro(err));
    }
  });

  function submit() {
    setError(null);
    if (!senhaAtual) {
      setError("Informe a senha atual");
      return;
    }
    if (novaSenha.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (novaSenha === senhaAtual) {
      setError("A nova senha deve ser diferente da senha atual");
      return;
    }
    if (novaSenha !== confirmar) {
      setError("As senhas não coincidem");
      return;
    }
    mutation.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Alterar senha"
      description="Você vai continuar conectado nesta sessão após a troca."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button loading={mutation.isPending} onClick={submit} icon={<KeyRound size={16} />}>
            Alterar senha
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

        <Field label="Senha atual" htmlFor="senha-atual" required>
          <Input
            id="senha-atual"
            data-autofocus
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(event) => setSenhaAtual(event.target.value)}
          />
        </Field>

        <Field label="Nova senha" htmlFor="senha-nova" required hint="Mínimo de 8 caracteres.">
          <Input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
          />
        </Field>

        <Field label="Confirmar nova senha" htmlFor="senha-confirmar" required>
          <Input
            id="senha-confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(event) => setConfirmar(event.target.value)}
          />
        </Field>

        <div className="inline-note">
          <Music2 size={14} /> Sua senha é armazenada com hash no backend e nunca volta para o
          navegador.
        </div>
      </div>
    </Modal>
  );
}

