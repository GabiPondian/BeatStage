import prisma from "../lib/prisma";
import {
  AtualizarFeedbackInput,
  FeedbackInput
} from "../schemas/feedbackSchema";
import {
  buscarBandaDoMusico,
  exigirLiderDaBanda,
  idsBandasDoMusico
} from "./acessoBandaService";

//CAMPOS DEVOLVIDOS PELA API (ANÔNIMO NUNCA REVELA O AUTOR)
const selecaoFeedback = {
  idFeedback: true,
  comentario: true,
  anonimo: true,
  idBanda: true,
  idMusico: true
} as const;

function formatarFeedback(feedback: {
  idFeedback: number;
  comentario: string;
  anonimo: boolean;
  idBanda: number;
  idMusico: number;
}) {
  return {
    idFeedback: feedback.idFeedback,
    comentario: feedback.comentario,
    anonimo: feedback.anonimo,
    idBanda: feedback.idBanda,
    idMusico: feedback.anonimo ? null : feedback.idMusico
  };
}

//FUNÇÃO DE CADASTRO DE FEEDBACK (SOMENTE QUEM PARTICIPA DA BANDA)
export async function cadastrarFeedback(
  dados: FeedbackInput,
  idMusicoAutenticado: number
) {
  await buscarBandaDoMusico(dados.idBanda, idMusicoAutenticado);

  const feedback = await prisma.feedback.create({
    data: {
      idBanda: dados.idBanda,
      comentario: dados.comentario,
      anonimo: dados.anonimo ?? false,
      idMusico: idMusicoAutenticado
    },
    select: selecaoFeedback
  });

  return formatarFeedback(feedback);
}

//FUNÇÃO DE LISTAR FEEDBACKS DAS BANDAS DO MÚSICO
export async function listarFeedbacks(idMusicoAutenticado: number) {
  const idsBandas = await idsBandasDoMusico(idMusicoAutenticado);

  const feedbacks = await prisma.feedback.findMany({
    where: {
      ativo: true,
      idBanda: { in: idsBandas }
    },
    select: selecaoFeedback,
    orderBy: { idFeedback: "desc" }
  });

  return feedbacks.map(formatarFeedback);
}

//FUNÇÃO DE BUSCAR FEEDBACK POR ID
export async function buscarFeedbackPorId(
  idFeedback: number,
  idMusicoAutenticado: number
) {
  const idsBandas = await idsBandasDoMusico(idMusicoAutenticado);

  const feedback = await prisma.feedback.findFirst({
    where: {
      idFeedback,
      ativo: true,
      idBanda: { in: idsBandas }
    },
    select: selecaoFeedback
  });

  if (!feedback) {
    return null;
  }

  return formatarFeedback(feedback);
}

//VERIFICA SE O MÚSICO PODE EDITAR/EXCLUIR O FEEDBACK (AUTOR OU LÍDER)
async function exigirAutorOuLider(
  idFeedback: number,
  idMusicoAutenticado: number
) {
  const feedback = await prisma.feedback.findFirst({
    where: { idFeedback, ativo: true },
    select: { idFeedback: true, idMusico: true, idBanda: true }
  });

  if (!feedback) {
    return null;
  }

  const souAutor = feedback.idMusico === idMusicoAutenticado;

  if (!souAutor) {
    //QUEM NÃO É AUTOR PRECISA SER O LÍDER DA BANDA
    await exigirLiderDaBanda(feedback.idBanda, idMusicoAutenticado);
  } else {
    //O AUTOR PRECISA CONTINUAR PARTICIPANDO DA BANDA
    await buscarBandaDoMusico(feedback.idBanda, idMusicoAutenticado);
  }

  return feedback;
}

//FUNÇÃO DE ATUALIZAR FEEDBACK (AUTOR OU LÍDER DA BANDA)
export async function atualizarFeedback(
  idFeedback: number,
  dados: AtualizarFeedbackInput,
  idMusicoAutenticado: number
) {
  const feedback = await exigirAutorOuLider(idFeedback, idMusicoAutenticado);

  if (!feedback) {
    return null;
  }

  const dadosAtualizados: {
    comentario?: string;
    anonimo?: boolean;
  } = {};

  if (dados.comentario !== undefined) {
    dadosAtualizados.comentario = dados.comentario;
  }

  if (dados.anonimo !== undefined) {
    dadosAtualizados.anonimo = dados.anonimo;
  }

  const atualizado = await prisma.feedback.update({
    where: { idFeedback },
    data: dadosAtualizados,
    select: selecaoFeedback
  });

  return formatarFeedback(atualizado);
}

//FUNÇÃO DE DELETAR FEEDBACK (EXCLUSÃO LÓGICA, AUTOR OU LÍDER)
export async function deletarFeedback(
  idFeedback: number,
  idMusicoAutenticado: number
) {
  const feedback = await exigirAutorOuLider(idFeedback, idMusicoAutenticado);

  if (!feedback) {
    return false;
  }

  await prisma.feedback.update({
    where: { idFeedback },
    data: { ativo: false }
  });

  return true;
}
