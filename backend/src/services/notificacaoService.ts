import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { publicarParaMusico } from "../lib/liveBus";

//CAMPOS DEVOLVIDOS PELA API
const selecaoNotificacao = {
  idNotificacao: true,
  idMusico: true,
  idBanda: true,
  idEvento: true,
  idRepertorio: true,
  tipo: true,
  titulo: true,
  mensagem: true,
  lida: true,
  criadoEm: true,
  banda: { select: { nome: true } },
  evento: { select: { nome: true } },
  repertorio: { select: { musica: true } }
} satisfies Prisma.NotificacaoSelect;

type NotificacaoComRelacoes = Prisma.NotificacaoGetPayload<{
  select: typeof selecaoNotificacao;
}>;

function formatarNotificacao(notificacao: NotificacaoComRelacoes) {
  return {
    idNotificacao: notificacao.idNotificacao,
    idMusico: notificacao.idMusico,
    idBanda: notificacao.idBanda,
    idEvento: notificacao.idEvento,
    idRepertorio: notificacao.idRepertorio,
    tipo: notificacao.tipo,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    lida: notificacao.lida,
    criadoEm: notificacao.criadoEm.toISOString(),
    banda: notificacao.banda.nome,
    evento: notificacao.evento?.nome ?? null,
    musica: notificacao.repertorio?.musica ?? null
  };
}

export interface NovaNotificacao {
  idMusico: number;
  idBanda: number;
  idEvento?: number | null;
  idRepertorio?: number | null;
  tipo: "ENTRADA" | "CUTUCAR" | "ALERTA";
  titulo: string;
  mensagem: string;
  bandaNome: string;
  eventoNome?: string | null;
  musica?: string | null;
}

export async function listarNotificacoes(idMusico: number) {
  const notificacoes = await prisma.notificacao.findMany({
    where: { idMusico },
    select: selecaoNotificacao,
    orderBy: [{ criadoEm: "desc" }, { idNotificacao: "desc" }],
    take: 50
  });

  return notificacoes.map(formatarNotificacao);
}

export async function marcarNotificacaoLida(
  idNotificacao: number,
  idMusico: number
) {
  const resultado = await prisma.notificacao.updateMany({
    where: { idNotificacao, idMusico },
    data: { lida: true }
  });

  if (resultado.count === 0) {
    throw new AppError("Notificação não encontrada", 404);
  }

  return true;
}

export async function marcarTodasNotificacoesLidas(idMusico: number) {
  const resultado = await prisma.notificacao.updateMany({
    where: { idMusico, lida: false },
    data: { lida: true }
  });

  return resultado.count;
}

/**
 * Cria as notificações no banco e as entrega em tempo real para as conexões
 * SSE do destinatário. O mesmo método é usado pelas entradas automáticas do
 * modo ao vivo e pelas cutucadas manuais.
 */
export async function criarNotificacoes(
  entradas: NovaNotificacao[]
): Promise<number> {
  if (entradas.length === 0) return 0;

  const criadas = [];

  for (const entrada of entradas) {
    const notificacao = await prisma.notificacao.create({
      data: {
        idMusico: entrada.idMusico,
        idBanda: entrada.idBanda,
        idEvento: entrada.idEvento ?? null,
        idRepertorio: entrada.idRepertorio ?? null,
        tipo: entrada.tipo,
        titulo: entrada.titulo,
        mensagem: entrada.mensagem
      },
      select: selecaoNotificacao
    });

    const formatada = {
      ...formatarNotificacao(notificacao),
      banda: entrada.bandaNome,
      evento: entrada.eventoNome ?? null,
      musica: entrada.musica ?? null
    };

    publicarParaMusico(entrada.idMusico, "notification", formatada);
    criadas.push(formatada);
  }

  return criadas.length;
}
