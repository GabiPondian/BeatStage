import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { authService } from "../../services/auth.service";
import { useToast } from "../../contexts/ToastContext";
import { ApiError, mensagemDeErro } from "../../lib/api";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setError(null);

    if (novaSenha.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (novaSenha !== confirmar) {
      setError("As senhas não coincidem");
      return;
    }

    setSubmitting(true);

    try {
      await authService.redefinirSenha(token, novaSenha);
      toast.success("Senha redefinida", "Entre com a nova senha para continuar.");
      navigate("/login", { replace: true });
    } catch (erro) {
      if (erro instanceof ApiError) {
        setError(erro.fields.novaSenha ?? erro.fields.token ?? null);
      }
      setFormError(mensagemDeErro(erro));
    } finally {
      setSubmitting(false);
    }
  }

  //SEM TOKEN NO ENDEREÇO NÃO HÁ O QUE REDEFINIR
  if (!token) {
    return (
      <AuthLayout backTo="/login" backLabel="Voltar ao login">
        <span className="auth-card__eyebrow">Link incompleto</span>
        <h2>Redefinição de senha</h2>
        <p className="auth-card__subtitle">
          Este endereço não tem um código de recuperação. Abra o link que chegou no seu
          e-mail ou peça um novo.
        </p>

        <div className="alert alert--error" role="alert">
          <AlertTriangle size={15} /> Código de recuperação ausente no endereço.
        </div>

        <Button
          variant="purple"
          size="lg"
          fullWidth
          iconRight={<ArrowRight size={17} />}
          onClick={() => navigate("/esqueci-senha")}
        >
          Pedir novo link
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      backTo="/login"
      backLabel="Voltar ao login"
      footerLink={
        <p>
          O link expirou? <Link to="/esqueci-senha">Pedir outro</Link>
        </p>
      }
    >
      <span className="auth-card__eyebrow">Criar nova senha</span>
      <h2>Defina sua senha</h2>
      <p className="auth-card__subtitle">
        Escolha uma senha nova para a sua conta. O link deixa de valer depois desta troca.
      </p>

      {formError ? (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Field
          label="Nova senha"
          htmlFor="nova-senha"
          error={error ?? undefined}
          hint="Mínimo de 8 caracteres."
          required
        >
          <div className="password-field">
            <Input
              id="nova-senha"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Sua nova senha"
              icon={<LockKeyhole size={16} />}
              value={novaSenha}
              invalid={Boolean(error)}
              onChange={(event) => setNovaSenha(event.target.value)}
              className="input--with-action"
              autoFocus
            />
            <button
              type="button"
              className="password-field__toggle"
              onClick={() => setShowPassword((valor) => !valor)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        <Field label="Confirmar nova senha" htmlFor="confirmar-senha" required>
          <Input
            id="confirmar-senha"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repita a nova senha"
            icon={<KeyRound size={16} />}
            value={confirmar}
            onChange={(event) => setConfirmar(event.target.value)}
          />
        </Field>

        <Button
          type="submit"
          variant="purple"
          size="lg"
          fullWidth
          loading={submitting}
          iconRight={<ArrowRight size={17} />}
        >
          Salvar nova senha
        </Button>
      </form>

      <div className="auth-card__secure">
        <LockKeyhole size={14} />
        Sua senha é guardada com hash e nunca volta para o navegador
      </div>
    </AuthLayout>
  );
}
