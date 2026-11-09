import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import {
  AtualizarRepertorioInput,
  RepertorioInput
} from "../schemas/repertorioSchema";
import { exigirLiderDaBanda } from "./acessoBandaService";

//CAMPOS DEVOLVIDOS PELA API (MÚSICOS VIRAM UMA LISTA COM A FUNÇÃO)
const selecaoRepertorio = {
  idRepertorio: true,
  musica: true,
  tom: true,
  duracaoSegundos: true,
  observacao: true,
  idBanda: true,
  musicos: {
    select: { idMusico: true, funcaoMusico: true },
    orderBy: { idMusico: "asc" }
  }
} satisfies Prisma.RepertorioSelect;

type RepertorioComMusicos = Prisma.RepertorioGetPayload<{
  select: typeof selecaoRepertorio;
}>;

function formatarRepertorio(repertorio: RepertorioComMusicos) {
  return {
    idRepertorio: repertorio.idRepertorio,
    musica: repertorio.musica,
    tom: repertorio.tom,
    duracaoSegundos: repertorio.duracaoSegundos,
    observacao: repertorio.observacao,
    idBanda: repertorio.idBanda,
    musicos: repertorio.musicos.map((musico) => ({
      idMusico: musico.idMusico,
      funcaoMusico: musico.funcaoMusico
    }))
  };
}

//FILTRO DE ACESSO: SOMENTE BANDAS ATIVAS EM QUE O MÚSICO PARTICIPA
function filtroAcesso(idMusico: number) {
  return {
    banda: {
      ativo: true,
      OR: [{ idLider: idMusico }, { membros: { some: { idMusico } } }]
    }
  };
}

//REMOVE MÚSICOS REPETIDOS MANTENDO A PRIMEIRA FUNÇÃO INFORMADA
function normalizarMusicos(
  musicos: { idMusico: number; funcaoMusico?: string }[]
) {
  const unicos = new Map<number, string | undefined>();

  for (const musico of musicos) {
    if (!unicos.has(musico.idMusico)) {
      unicos.set(musico.idMusico, musico.funcaoMusico);
    }
  }

  return [...unicos.entries()].map(([idMusico, funcaoMusico]) => ({
    idMusico,
    funcaoMusico
  }));
}

//VERIFICA SE OS MÚSICOS INFORMADOS EXISTEM E ESTÃO ATIVOS
async function validarMusicos(idsMusicos: number[]) {
  if (idsMusicos.length === 0) {
    return;
  }

  const encontrados = await prisma.musico.findMany({
    where: { idMusico: { in: idsMusicos }, ativo: true },
    select: { idMusico: true }
  });

  if (encontrados.length === idsMusicos.length) {
    return;
  }

  const idsEncontrados = new Set(encontrados.map((musico) => musico.idMusico));
  const ausentes = idsMusicos.filter((id) => !idsEncontrados.has(id));

  throw new AppError(`Músico(s) não encontrado(s): ${ausentes.join(", ")}`, 404);
}

//FUNÇÃO DE CADASTRO DE REPERTÓRIO (SOMENTE O LÍDER DA BANDA)
export async function cadastrarRepertorio(
  dados: RepertorioInput,
  idMusicoAutenticado: number
) {
  await exigirLiderDaBanda(dados.idBanda, idMusicoAutenticado);

  const musicos = normalizarMusicos(dados.musicos ?? []);

  await validarMusicos(musicos.map((musico) => musico.idMusico));

  const repertorio = await prisma.repertorio.create({
    data: {
      idBanda: dados.idBanda,
      musica: dados.musica,
      tom: dados.tom,
      duracaoSegundos: dados.duracaoSegundos,
      observacao: dados.observacao,
      musicos: {
        create: musicos.map((musico) => ({
          musico: { connect: { idMusico: musico.idMusico } },
          funcaoMusico: musico.funcaoMusico
        }))
      }
    },
    select: selecaoRepertorio
  });

  return formatarRepertorio(repertorio);
}

//FUNÇÃO DE LISTAR REPERTÓRIOS DAS BANDAS DO MÚSICO
export async function listarRepertorios(idMusicoAutenticado: number) {
  const repertorios = await prisma.repertorio.findMany({
    where: {
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoRepertorio,
    orderBy: { idRepertorio: "asc" }
  });

  return repertorios.map(formatarRepertorio);
}

//FUNÇÃO DE BUSCAR REPERTÓRIO POR ID
export async function buscarRepertorioPorId(
  idRepertorio: number,
  idMusicoAutenticado: number
) {
  const repertorio = await prisma.repertorio.findFirst({
    where: {
      idRepertorio,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoRepertorio
  });

  if (!repertorio) {
    return null;
  }

  return formatarRepertorio(repertorio);
}

//FUNÇÃO DE ATUALIZAR REPERTÓRIO (SOMENTE O LÍDER DA BANDA)
export async function atualizarRepertorio(
  idRepertorio: number,
  dados: AtualizarRepertorioInput,
  idMusicoAutenticado: number
) {
  const existente = await prisma.repertorio.findFirst({
    where: {
      idRepertorio,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idRepertorio: true, idBanda: true }
  });

  if (!existente) {
    return null;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  const { musicos, ...campos } = dados;

  const musicosNormalizados =
    musicos !== undefined ? normalizarMusicos(musicos) : undefined;

  if (musicosNormalizados !== undefined) {
    await validarMusicos(musicosNormalizados.map((m) => m.idMusico));
  }

  const dadosAtualizados: {
    musica?: string;
    tom?: string | null;
    duracaoSegundos?: number | null;
    observacao?: string | null;
  } = {};

  if (campos.musica !== undefined) {
    dadosAtualizados.musica = campos.musica;
  }

  if (campos.tom !== undefined) {
    dadosAtualizados.tom = campos.tom;
  }

  if (campos.duracaoSegundos !== undefined) {
    dadosAtualizados.duracaoSegundos = campos.duracaoSegundos;
  }

  if (campos.observacao !== undefined) {
    dadosAtualizados.observacao = campos.observacao;
  }

  const repertorio = await prisma.$transaction(async (tx) => {
    if (musicosNormalizados !== undefined) {
      await tx.repertorioMusico.deleteMany({ where: { idRepertorio } });

      if (musicosNormalizados.length > 0) {
        await tx.repertorioMusico.createMany({
          data: musicosNormalizados.map((musico) => ({
            idRepertorio,
            idMusico: musico.idMusico,
            funcaoMusico: musico.funcaoMusico
          }))
        });
      }
    }

    return tx.repertorio.update({
      where: { idRepertorio },
      data: dadosAtualizados,
      select: selecaoRepertorio
    });
  });

  return formatarRepertorio(repertorio);
}

//FUNÇÃO DE DELETAR REPERTÓRIO (EXCLUSÃO LÓGICA)
export async function deletarRepertorio(
  idRepertorio: number,
  idMusicoAutenticado: number
) {
  const existente = await prisma.repertorio.findFirst({
    where: {
      idRepertorio,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idRepertorio: true, idBanda: true }
  });

  if (!existente) {
    return false;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  await prisma.repertorio.update({
    where: { idRepertorio },
    data: { ativo: false }
  });

  return true;
}
