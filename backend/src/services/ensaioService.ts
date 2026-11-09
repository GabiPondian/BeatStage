import prisma from "../lib/prisma";
import { AtualizarEnsaioInput, EnsaioInput } from "../schemas/ensaioSchema";
import { exigirLiderDaBanda } from "./acessoBandaService";

//CAMPOS DEVOLVIDOS PELA API
const selecaoEnsaio = {
  idEnsaio: true,
  data: true,
  local: true,
  descricao: true,
  idBanda: true
} as const;

//FILTRO DE ACESSO: SOMENTE BANDAS ATIVAS EM QUE O MÚSICO PARTICIPA
function filtroAcesso(idMusico: number) {
  return {
    banda: {
      ativo: true,
      OR: [{ idLider: idMusico }, { membros: { some: { idMusico } } }]
    }
  };
}

//FUNÇÃO DE CADASTRO DE ENSAIO (SOMENTE O LÍDER DA BANDA)
export async function cadastrarEnsaio(
  dados: EnsaioInput,
  idMusicoAutenticado: number
) {
  await exigirLiderDaBanda(dados.idBanda, idMusicoAutenticado);

  return prisma.ensaio.create({
    data: {
      idBanda: dados.idBanda,
      data: dados.data,
      local: dados.local,
      descricao: dados.descricao
    },
    select: selecaoEnsaio
  });
}

//FUNÇÃO DE LISTAR ENSAIOS DAS BANDAS DO MÚSICO
export async function listarEnsaios(idMusicoAutenticado: number) {
  return prisma.ensaio.findMany({
    where: {
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoEnsaio,
    orderBy: [{ data: "asc" }, { idEnsaio: "asc" }]
  });
}

//FUNÇÃO DE BUSCAR ENSAIO POR ID
export async function buscarEnsaioPorId(
  idEnsaio: number,
  idMusicoAutenticado: number
) {
  return prisma.ensaio.findFirst({
    where: {
      idEnsaio,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoEnsaio
  });
}

//FUNÇÃO DE ATUALIZAR ENSAIO (SOMENTE O LÍDER DA BANDA)
export async function atualizarEnsaio(
  idEnsaio: number,
  dados: AtualizarEnsaioInput,
  idMusicoAutenticado: number
) {
  const existente = await prisma.ensaio.findFirst({
    where: {
      idEnsaio,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idEnsaio: true, idBanda: true }
  });

  if (!existente) {
    return null;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  const dadosAtualizados: {
    data?: Date;
    local?: string | null;
    descricao?: string | null;
  } = {};

  if (dados.data !== undefined) {
    dadosAtualizados.data = dados.data;
  }

  if (dados.local !== undefined) {
    dadosAtualizados.local = dados.local;
  }

  if (dados.descricao !== undefined) {
    dadosAtualizados.descricao = dados.descricao;
  }

  return prisma.ensaio.update({
    where: { idEnsaio },
    data: dadosAtualizados,
    select: selecaoEnsaio
  });
}

//FUNÇÃO DE DELETAR ENSAIO (EXCLUSÃO LÓGICA)
export async function deletarEnsaio(
  idEnsaio: number,
  idMusicoAutenticado: number
) {
  const existente = await prisma.ensaio.findFirst({
    where: {
      idEnsaio,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idEnsaio: true, idBanda: true }
  });

  if (!existente) {
    return false;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  await prisma.ensaio.update({
    where: { idEnsaio },
    data: { ativo: false }
  });

  return true;
}
