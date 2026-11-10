import nodemailer, { Transporter } from "nodemailer";

//ENVIO POR SMTP GENÉRICO: FUNCIONA COM GMAIL (SENHA DE APP), MAILTRAP, BREVO,
//RESEND (SMTP), POSTMARK OU QUALQUER PROVEDOR QUE OFEREÇA HOST/PORTA/USUÁRIO
//SEM SMTP_HOST CONFIGURADO O E-MAIL NÃO É ENVIADO: O CONTEÚDO VAI PARA O TERMINAL

let transporter: Transporter | null = null;

export function emailConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

//URL DA APLICAÇÃO USADA PARA MONTAR O LINK DE RECUPERAÇÃO
export function urlDaAplicacao(): string {
  return (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
}

function obterTransporter(): Transporter {
  if (!transporter) {
    const porta = Number(process.env.SMTP_PORT) || 587;

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: process.env.SMTP_SECURE === "true" || porta === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }

  return transporter;
}

interface EmailRecuperacao {
  para: string;
  nome: string;
  link: string;
  validadeMinutos: number;
}

function montarHtml(dados: EmailRecuperacao): string {
  const primeiroNome = dados.nome.split(" ")[0] ?? dados.nome;

  return `
  <div style="background:#f4f1fa;padding:32px 16px;font-family:'Segoe UI',Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
      <div style="background:#5b2a86;padding:28px 32px">
        <span style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.02em">BeatStage</span>
      </div>
      <div style="padding:32px">
        <h1 style="margin:0 0 12px;font-size:20px;color:#1f1b24">Olá, ${primeiroNome}</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b4453">
          Recebemos um pedido para redefinir a senha da sua conta no BeatStage.
          Clique no botão abaixo para criar uma nova senha.
        </p>
        <a href="${dados.link}"
           style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;
                  padding:14px 26px;border-radius:10px;font-size:15px;font-weight:600">
          Criar nova senha
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b6478">
          O link vale <strong>${dados.validadeMinutos} minutos</strong> e pode ser usado uma única vez.
          Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.
        </p>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8a8496;word-break:break-all">
          Se o botão não abrir, copie este endereço no navegador:<br>${dados.link}
        </p>
      </div>
    </div>
  </div>`;
}

//DEVOLVE true QUANDO O E-MAIL FOI ENTREGUE AO PROVEDOR E false NO MODO CONSOLE
export async function enviarEmailRecuperacao(
  dados: EmailRecuperacao
): Promise<boolean> {
  const html = montarHtml(dados);
  const texto =
    `Olá, ${dados.nome}. Acesse ${dados.link} para criar uma nova senha no BeatStage. ` +
    `O link vale ${dados.validadeMinutos} minutos e só pode ser usado uma vez.`;

  if (!emailConfigurado()) {
    console.log("\n=== E-MAIL DE RECUPERAÇÃO (SMTP NÃO CONFIGURADO) ===");
    console.log(`Para:   ${dados.para}`);
    console.log(`Link:   ${dados.link}`);
    console.log(`Validade: ${dados.validadeMinutos} minutos`);
    console.log("Configure SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS para enviar de verdade.\n");
    return false;
  }

  await obterTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: dados.para,
    subject: "Recuperação de senha - BeatStage",
    text: texto,
    html
  });

  return true;
}
