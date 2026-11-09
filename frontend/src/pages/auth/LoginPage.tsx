import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { ApiError, mensagemDeErro } from "../../lib/api";

interface LocationState {
  from?: string;
  email?: string;
  cadastro?: boolean;
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const { login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState(state.email ?? "");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; senha?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof errors = {};

    if (!email.trim()) nextErrors.email = "Informe o e-mail";
    else if (!validarEmail(email.trim())) nextErrors.email = "Informe um e-mail válido";

    if (!senha) nextErrors.senha = "Informe a senha";

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const musico = await login(email.trim(), senha);
      toast.success(`Bem-vindo, ${musico.nome.split(" ")[0]}!`, "Seu palco está pronto.");
      navigate(state.from ?? "/inicio", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({
          email: error.fields.email,
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
      footerLink={
        <p>
          Ainda não tem uma conta? <Link to="/cadastro">Cadastre-se gratuitamente</Link>
        </p>
      }
    >
      <span className="auth-card__eyebrow">Acesse sua conta</span>
      <h2>Entre na sua conta</h2>
      <p className="auth-card__subtitle">
        Continue de onde parou. Sua banda, seu repertório e sua agenda esperam por você.
      </p>

      {formError ? (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Field label="E-mail" htmlFor="login-email" error={errors.email} required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="voce@beatstage.com"
            icon={<Mail size={16} />}
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Senha" htmlFor="login-senha" error={errors.senha} required>
          <div className="password-field">
            <Input
              id="login-senha"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Sua senha"
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

        <Button
          type="submit"
          variant="purple"
          size="lg"
          fullWidth
          loading={submitting}
          iconRight={<ArrowRight size={17} />}
        >
          Entrar
        </Button>
      </form>

      <div className="auth-card__secure">
        <LockKeyhole size={14} />
        Conexão protegida · sua senha nunca é armazenada no navegador
      </div>
    </AuthLayout>
  );
}
