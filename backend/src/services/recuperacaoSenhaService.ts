import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { enviarEmailRecuperacao, urlDaAplicacao } from "../lib/mailer";
import { RedefinirSenhaInput } from "../schemas/recuperacaoSenhaSchema";

//O LINK VALE 1 HORA E SÓ PODE SER USADO UMA VEZ
const VALIDADE_MINUTOS = 60;

//O BANCO GUARDA SÓ O HASH: O TOKEN PURO EXISTE APENAS NO E-MAIL
function gerarHashDoToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

//PEDIDO DE RECUPERAÇÃO
//A RESPOSTA É SEMPRE A MESMA, EXISTA OU NÃO A CONTA (EVITA DESCOBRIR E-MAILS CADASTRADOS)
export async function solicitarRecuperacaoSenha(
  emailInformado: string
): Promise<{ enviado: boolean }> {
  const email = emailInformado.toLowerCase();

  const musico = await prisma.musico.findUnique({
    where: { email },
    select: { idMusico: true, nome: true, email: true, ativo: true }
  });

  if (!musico || !musico.ativo) {
    return { enviado: false };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = gerarHashDoToken(token);
  const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);

  //PEDIR UM NOVO LINK INVALIDA OS ANTERIORES QUE AINDA NÃO FORAM USADOS
  await prisma.$transaction([
    prisma.recuperacaoSenha.updateMany({
      where: { idMusico: musico.idMusico, usadoEm: null },
      data: { usadoEm: new Date() }
    }),
    prisma.recuperacaoSenha.create({
      data: { idMusico: musico.idMusico, tokenHash, expiraEm }
    })
  ]);

  const link = `${urlDaAplicacao()}/redefinir-senha?token=${token}`;

  try {
    const enviado = await enviarEmailRecuperacao({
      para: musico.email,
      nome: musico.nome,
      link,
      validadeMinutos: VALIDADE_MINUTOS
    });

    return { enviado };
  } catch (erro) {
    //SEM O E-MAIL O LINK NÃO CHEGA: O TOKEN RECÉM-CRIADO É INUTILIZADO
    await prisma.recuperacaoSenha.updateMany({
      where: { idMusico: musico.idMusico, usadoEm: null },
      data: { usadoEm: new Date() }
    });

    console.error("Falha ao enviar o e-mail de recuperação:", erro);

    throw new AppError(
      "Não foi possível enviar o e-mail agora. Tente novamente em instantes.",
      503
    );
  }
}

//REDEFINIÇÃO COM O TOKEN DO E-MAIL
export async function redefinirSenhaComToken(
  dados: RedefinirSenhaInput
): Promise<void> {
  const tokenHash = gerarHashDoToken(dados.token);

  const registro = await prisma.recuperacaoSenha.findUnique({
    where: { tokenHash },
    select: {
      idRecuperacao: true,
      idMusico: true,
      expiraEm: true,
      usadoEm: true,
      musico: { select: { ativo: true } }
    }
  });

  //MESMA MENSAGEM PARA TOKEN INEXISTENTE, USADO OU EXPIRADO
  if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
    throw new AppError(
      "Link de recuperação inválido ou expirado. Solicite um novo.",
      400
    );
  }

  if (!registro.musico.ativo) {
    throw new AppError("Conta inativa", 403);
  }

  const senhaHash = await bcrypt.hash(dados.novaSenha, 10);

  await prisma.$transaction([
    prisma.musico.update({
      where: { idMusico: registro.idMusico },
      data: { senhaHash }
    }),
    //O TOKEN USADO É MARCADO E OS DEMAIS PENDENTES SÃO INVALIDADO
    prisma.recuperacaoSenha.update({
      where: { idRecuperacao: registro.idRecuperacao },
      data: { usadoEm: new Date() }
    }),
    prisma.recuperacaoSenha.updateMany({
      where: { idMusico: registro.idMusico, usadoEm: null },
      data: { usadoEm: new Date() }
    })
  ]);
}
