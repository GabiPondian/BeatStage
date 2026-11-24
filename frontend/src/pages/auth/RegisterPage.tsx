import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  AtSign,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  Music2,
  Trash2,
  Upload
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

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TAMANHO_MAXIMO = 3 * 1024 * 1024;

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
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  //LIBERA A URL TEMPORÁRIA DA PRÉVIA QUANDO ELA TROCA OU A TELA SAI
  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    };
  }, [fotoPreview]);

  function selecionarFoto(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];

    //PERMITE ESCOLHER O MESMO ARQUIVO DE NOVO
    event.target.value = "";

    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setErrors((atual) => ({
        ...atual,
        fotoPerfil: "Envie uma imagem JPEG, PNG, WEBP ou GIF"
      }));
      return;
    }

    if (arquivo.size > TAMANHO_MAXIMO) {
      setErrors((atual) => ({
        ...atual,
        fotoPerfil: "A imagem deve ter no máximo 3 MB"
      }));
      return;
    }

    setErrors((atual) => ({ ...atual, fotoPerfil: undefined }));
    setFotoArquivo(arquivo);
    setFotoPreview(URL.createObjectURL(arquivo));
  }

  function removerFoto() {
    setFotoArquivo(null);
    setFotoPreview(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (nome.trim().length < 2) nextErrors.nome = "Informe seu nome completo";
    if (!email.trim()) nextErrors.email = "Informe o e-mail";
    else if (!validarEmail(email.trim())) nextErrors.email = "Informe um e-mail válido";
    if (cargo.trim().length < 2) nextErrors.cargo = "Informe sua função musical";
    if (senha.length < 8) nextErrors.senha = "A senha deve ter pelo menos 8 caracteres";
    if (confirmarSenha !== senha) {
      nextErrors.confirmarSenha = "As senhas não coincidem";
    }

    setErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      const resposta = await musicosService.criar(
        {
          nome: nome.trim(),
          email: email.trim(),
          senha,
          cargo: cargo.trim()
        },
        fotoArquivo
      );

      toast.success(resposta.mensagem, "Agora é só entrar no palco.");
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
          <Avatar name={nome || "Novo músico"} src={fotoPreview} size="lg" />
          <div className="profile-photo-row__field">
            <Field
              label="Foto de perfil"
              htmlFor="cadastro-foto"
              error={errors.fotoPerfil}
              hint="Opcional. JPEG, PNG, WEBP ou GIF, até 3 MB."
            >
              <div className="profile-photo-upload">
                <input
                  id="cadastro-foto"
                  ref={inputFotoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="profile-photo-upload__input"
                  onChange={selecionarFoto}
                />
                <div className="profile-photo-upload__actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Upload size={14} />}
                    onClick={() => inputFotoRef.current?.click()}
                  >
                    Escolher imagem
                  </Button>
                  {fotoPreview ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={removerFoto}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
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
