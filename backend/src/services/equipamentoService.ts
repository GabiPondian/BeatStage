import prisma from "../lib/prisma";
import {
  AtualizarEquipamentoInput,
  EquipamentoInput
} from "../schemas/equipamentoSchema";
import { exigirLiderDaBanda } from "./acessoBandaService";

//CAMPOS DEVOLVIDOS PELA API
const selecaoEquipamento = {
  idEquipamento: true,
  nome: true,
  estado: true,
  responsavel: true,
  descricao: true,
  idBanda: true
} as const;

//FILTRO DE ACESSO: SOMENTE BANDAS ATIVAS EM QUE O MÚSICO PARTICIPA
function filtroAcesso(idMusico: number) {
  return {
    banda: {
      ativo: true,
      OR: [
        { idLider: idMusico },
        { membros: { some: { idMusico } } }
      ]
    }
  };
}

//FUNÇÃO DE CADASTRO DE EQUIPAMENTO (SOMENTE O LÍDER DA BANDA)
export async function cadastrarEquipamento(
  dados: EquipamentoInput,
  idMusicoAutenticado: number
) {
  await exigirLiderDaBanda(dados.idBanda, idMusicoAutenticado);

  return prisma.equipamento.create({
    data: {
      nome: dados.nome,
      estado: dados.estado,
      responsavel: dados.responsavel,
      descricao: dados.descricao,
      idBanda: dados.idBanda
    },
    select: selecaoEquipamento
  });
}

//FUNÇÃO DE LISTAR EQUIPAMENTOS DAS BANDAS DO MÚSICO
export async function listarEquipamentos(idMusicoAutenticado: number) {
  return prisma.equipamento.findMany({
    where: {
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoEquipamento,
    orderBy: { idEquipamento: "asc" }
  });
}

//FUNÇÃO DE BUSCAR EQUIPAMENTO POR ID
export async function buscarEquipamentoPorId(
  idEquipamento: number,
  idMusicoAutenticado: number
) {
  return prisma.equipamento.findFirst({
    where: {
      idEquipamento,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoEquipamento
  });
}

//FUNÇÃO DE ATUALIZAR EQUIPAMENTO (SOMENTE O LÍDER DA BANDA)
export async function atualizarEquipamento(
  idEquipamento: number,
  dados: AtualizarEquipamentoInput,
  idMusicoAutenticado: number
) {
  const existente = await prisma.equipamento.findFirst({
    where: {
      idEquipamento,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idEquipamento: true, idBanda: true }
  });

  if (!existente) {
    return null;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  if (dados.idBanda !== undefined && dados.idBanda !== existente.idBanda) {
    await exigirLiderDaBanda(dados.idBanda, idMusicoAutenticado);
  }

  const dadosAtualizados: {
    nome?: string;
    estado?: "PROPRIO" | "EMPRESTADO";
    responsavel?: string | null;
    descricao?: string | null;
    idBanda?: number;
  } = {};

  if (dados.nome !== undefined) {
    dadosAtualizados.nome = dados.nome;
  }

  if (dados.estado !== undefined) {
    dadosAtualizados.estado = dados.estado;
  }

  if (dados.responsavel !== undefined) {
    dadosAtualizados.responsavel = dados.responsavel;
  }

  if (dados.descricao !== undefined) {
    dadosAtualizados.descricao = dados.descricao;
  }

  if (dados.idBanda !== undefined) {
    dadosAtualizados.idBanda = dados.idBanda;
  }

  return prisma.equipamento.update({
    where: { idEquipamento },
    data: dadosAtualizados,
    select: selecaoEquipamento
  });
}

//FUNÇÃO DE DELETAR EQUIPAMENTO (EXCLUSÃO LÓGICA)
export async function deletarEquipamento(
  idEquipamento: number,
  idMusicoAutenticado: number
) {
  const existente = await prisma.equipamento.findFirst({
    where: {
      idEquipamento,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idEquipamento: true, idBanda: true }
  });

  if (!existente) {
    return false;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  await prisma.equipamento.update({
    where: { idEquipamento },
    data: { ativo: false }
  });

  return true;
}
