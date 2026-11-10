import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Mail } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { authService } from "../../services/auth.service";
import { ApiError, mensagemDeErro } from "../../lib/api";

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [smtpConfigurado, setSmtpConfigurado] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setError(null);

    if (!email.trim()) {
      setError("Informe o e-mail");
      return;
    }

    if (!validarEmail(email.trim())) {
      setError("Informe um e-mail válido");
      return;
    }

    setSubmitting(true);

    try {
      const resposta = await authService.esqueciSenha(email.trim());
      setSmtpConfigurado(resposta.smtpConfigurado);
      setEnviado(true);
    } catch (erro) {
      if (erro instanceof ApiError) {
        setError(erro.fields.email ?? null);
      }
      setFormError(mensagemDeErro(erro));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      backTo="/login"
      backLabel="Voltar ao login"
      footerLink={
        <p>
          Lembrou a senha? <Link to="/login">Entrar na conta</Link>
        </p>
      }
    >
      {enviado ? (
        <>
          <span className="auth-card__eyebrow">Confira seu e-mail</span>
          <h2>Link enviado</h2>
          <p className="auth-card__subtitle">
            Se existir uma conta com <strong>{email.trim()}</strong>, enviamos um link
            para criar uma nova senha. O link vale 1 hora e só pode ser usado uma vez.
          </p>

          <div className="inline-note">
            <Check size={14} /> Verifique também a pasta de spam ou lixo eletrônico.
          </div>

          {!smtpConfigurado ? (
            <div className="alert alert--error" role="alert">
              SMTP não configurado neste ambiente: o link foi impresso no terminal do
              backend, não enviado por e-mail. Preencha SMTP_HOST, SMTP_USER e SMTP_PASS
              no backend/.env para enviar de verdade.
            </div>
          ) : null}

          <Button
            variant="purple"
            size="lg"
            fullWidth
            iconRight={<ArrowRight size={17} />}
            onClick={() => navigate("/login")}
          >
            Voltar ao login
          </Button>
        </>
      ) : (
        <>
          <span className="auth-card__eyebrow">Recuperar acesso</span>
          <h2>Esqueceu a senha?</h2>
          <p className="auth-card__subtitle">
            Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova
            senha.
          </p>

          {formError ? (
            <div className="alert alert--error" role="alert">
              {formError}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Field
              label="E-mail"
              htmlFor="recuperar-email"
              error={error ?? undefined}
              required
            >
              <Input
                id="recuperar-email"
                type="email"
                autoComplete="email"
                placeholder="voce@beatstage.com"
                icon={<Mail size={16} />}
                value={email}
                invalid={Boolean(error)}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
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
              Enviar link de recuperação
            </Button>
          </form>

          <div className="auth-card__secure">
            <Mail size={14} />
            Por segurança, não informamos se um e-mail está cadastrado
          </div>
        </>
      )}
    </AuthLayout>
  );
}
