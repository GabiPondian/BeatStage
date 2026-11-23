import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  Camera,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  Music2
} from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Avatar } from "../../components/ui/Avatar";
import { useToast } from "../../contexts/ToastContext";
import { musicosService } from "../../services/musicos.service";
import { ApiError, mensagemDeErro } from "../../lib/api";
import { CARGOS_SUGERIDOS } from "../../lib/constants";

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

interface FormErrors {
  nome?: string;
  email?: string;
  cargo?: string;
  fotoPerfil?: string;
  senha?: string;
  confirmarSenha?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (nome.trim().length < 2) nextErrors.nome = "Informe seu nome completo";
    if (!email.trim()) nextErrors.email = "Informe o e-mail";
    else if (!validarEmail(email.trim())) nextErrors.email = "Informe um e-mail válido";
    if (cargo.trim().length < 2) nextErrors.cargo = "Informe sua função musical";
    if (!validarUrl(fotoPerfil)) {
      nextErrors.fotoPerfil = "Informe uma URL http(s) válida ou deixe em branco";
    }
    if (senha.length < 8) nextErrors.senha = "A senha deve ter pelo menos 8 caracteres";
    if (confirmarSenha !== senha) {
      nextErrors.confirmarSenha = "As senhas não coincidem";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      await musicosService.criar({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        cargo: cargo.trim(),
        ...(fotoPerfil.trim() ? { fotoPerfil: fotoPerfil.trim() } : {})
      });

      toast.success("Cadastro realizado com sucesso!", "Agora é só entrar no palco.");
      navigate("/login", { state: { email: email.trim(), cadastro: true }, replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          nome: error.fields.nome,
          email: error.fields.email,
          cargo: error.fields.cargo,
          fotoPerfil: error.fields.fotoPerfil,
          senha: error.fields.senha
        });
      }
      setFormError(mensagemDeErro(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      hero="register"
      backTo="/login"
      backLabel="Voltar ao login"
      footerLink={
        <p>
          Já possui uma conta? <Link to="/login">Voltar para o login</Link>
        </p>
      }
    >
      <span className="auth-card__eyebrow">Comece agora</span>
      <h2>Crie sua conta</h2>
      <p className="auth-card__subtitle">
        Preencha seus dados para fazer parte do BeatStage.
      </p>

      {formError ? (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="profile-photo-row">
          <Avatar name={nome || "Novo músico"} src={fotoPerfil || null} size="lg" />
          <div className="profile-photo-row__field">
            <Field
              label="Foto de perfil (URL)"
              htmlFor="cadastro-foto"
              error={errors.fotoPerfil}
              hint="Opcional. Cole o endereço de uma imagem."
            >
              <Input
                id="cadastro-foto"
                type="url"
                placeholder="https://..."
                icon={<Camera size={16} />}
                value={fotoPerfil}
                invalid={Boolean(errors.fotoPerfil)}
                onChange={(event) => setFotoPerfil(event.target.value)}
              />
            </Field>
          </div>
        </div>

        <Field label="Nome completo" htmlFor="cadastro-nome" error={errors.nome} required>
          <Input
            id="cadastro-nome"
            autoComplete="name"
            placeholder="Como quer ser chamado?"
            icon={<UserRound size={16} />}
            value={nome}
            invalid={Boolean(errors.nome)}
            onChange={(event) => setNome(event.target.value)}
            autoFocus
          />
        </Field>

        <Field label="E-mail" htmlFor="cadastro-email" error={errors.email} required>
          <Input
            id="cadastro-email"
            type="email"
            autoComplete="email"
            placeholder="voce@beatstage.com"
            icon={<AtSign size={16} />}
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field
          label="Função musical"
          htmlFor="cadastro-cargo"
          error={errors.cargo}
          hint="Ex.: vocalista, guitarrista, baterista..."
          required
        >
          <Input
            id="cadastro-cargo"
            list="cargos-sugeridos"
            placeholder="Sua função na banda"
            icon={<Music2 size={16} />}
            value={cargo}
            invalid={Boolean(errors.cargo)}
            onChange={(event) => setCargo(event.target.value)}
          />
          <datalist id="cargos-sugeridos">
            {CARGOS_SUGERIDOS.map((cargoSugerido) => (
              <option key={cargoSugerido} value={cargoSugerido} />
            ))}
          </datalist>
        </Field>

        <div className="form-grid form-grid--two">
          <Field label="Senha" htmlFor="cadastro-senha" error={errors.senha} required>
            <div className="password-field">
              <Input
                id="cadastro-senha"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mín. 8 caracteres"
                icon={<LockKeyhole size={16} />}
                value={senha}
                invalid={Boolean(errors.senha)}
                onChange={(event) => setSenha(event.target.value)}
                className="input--with-action"
              />
              <button
                type="button"
                className="password-field__toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>

          <Field
            label="Confirmar senha"
            htmlFor="cadastro-confirmar"
            error={errors.confirmarSenha}
            required
          >
            <Input
              id="cadastro-confirmar"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repita a senha"
              icon={<LockKeyhole size={16} />}
              value={confirmarSenha}
              invalid={Boolean(errors.confirmarSenha)}
              onChange={(event) => setConfirmarSenha(event.target.value)}
            />
          </Field>
        </div>

        <Button
          type="submit"
          variant="purple"
          size="lg"
          fullWidth
          loading={submitting}
          iconRight={<ArrowRight size={17} />}
        >
          Criar conta
        </Button>
      </form>

      <p className="auth-card__terms">
        Ao criar sua conta, você concorda em manter os dados da sua banda seguros e
        usar a plataforma com respeito aos demais músicos.
      </p>
    </AuthLayout>
  );
}
