import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import {
  AtualizarEventoInput,
  EventoInput
} from "../schemas/eventoSchema";
import { exigirLiderDaBanda } from "./acessoBandaService";

//CAMPOS DEVOLVIDOS PELA API (VÍNCULOS VIRAM LISTAS DE IDS)
const selecaoEvento = {
  idEvento: true,
  nome: true,
  data: true,
  local: true,
  descricao: true,
  idBanda: true,
  equipamentos: {
    select: { idEquipamento: true },
    orderBy: { idEquipamento: "asc" }
  },
  repertorios: {
    select: { idRepertorio: true },
    orderBy: { idRepertorio: "asc" }
  }
} satisfies Prisma.EventoSelect;

type EventoComRelacoes = Prisma.EventoGetPayload<{
  select: typeof selecaoEvento;
}>;

function formatarEvento(evento: EventoComRelacoes) {
  return {
    idEvento: evento.idEvento,
    nome: evento.nome,
    data: evento.data,
    local: evento.local,
    descricao: evento.descricao,
    idBanda: evento.idBanda,
    idEquipamentos: evento.equipamentos.map((item) => item.idEquipamento),
    idRepertorios: evento.repertorios.map((item) => item.idRepertorio)
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

//VERIFICA SE OS EQUIPAMENTOS PERTENCEM À BANDA E ESTÃO ATIVOS
async function validarEquipamentos(idBanda: number, ids: number[]) {
  if (ids.length === 0) {
    return;
  }

  const encontrados = await prisma.equipamento.findMany({
    where: { idEquipamento: { in: ids }, idBanda, ativo: true },
    select: { idEquipamento: true }
  });

  if (encontrados.length === ids.length) {
    return;
  }

  const idsEncontrados = new Set(
    encontrados.map((item) => item.idEquipamento)
  );
  const ausentes = ids.filter((id) => !idsEncontrados.has(id));

  throw new AppError(
    `Equipamento(s) não encontrado(s) nesta banda: ${ausentes.join(", ")}`,
    404
  );
}

//VERIFICA SE OS REPERTÓRIOS PERTENCEM À BANDA E ESTÃO ATIVOS
async function validarRepertorios(idBanda: number, ids: number[]) {
  if (ids.length === 0) {
    return;
  }

  const encontrados = await prisma.repertorio.findMany({
    where: { idRepertorio: { in: ids }, idBanda, ativo: true },
    select: { idRepertorio: true }
  });

  if (encontrados.length === ids.length) {
    return;
  }

  const idsEncontrados = new Set(encontrados.map((item) => item.idRepertorio));
  const ausentes = ids.filter((id) => !idsEncontrados.has(id));

  throw new AppError(
    `Repertório(s) não encontrado(s) nesta banda: ${ausentes.join(", ")}`,
    404
  );
}

//FUNÇÃO DE CADASTRO DE EVENTO (SOMENTE O LÍDER DA BANDA)
export async function cadastrarEvento(
  dados: EventoInput,
  idMusicoAutenticado: number
) {
  await exigirLiderDaBanda(dados.idBanda, idMusicoAutenticado);

  const idsEquipamentos = [...new Set(dados.idEquipamentos ?? [])];
  const idsRepertorios = [...new Set(dados.idRepertorios ?? [])];

  await validarEquipamentos(dados.idBanda, idsEquipamentos);
  await validarRepertorios(dados.idBanda, idsRepertorios);

  const evento = await prisma.evento.create({
    data: {
      idBanda: dados.idBanda,
      nome: dados.nome,
      data: dados.data,
      local: dados.local,
      descricao: dados.descricao,
      equipamentos: {
        create: idsEquipamentos.map((idEquipamento) => ({
          equipamento: { connect: { idEquipamento } }
        }))
      },
      repertorios: {
        create: idsRepertorios.map((idRepertorio) => ({
          repertorio: { connect: { idRepertorio } }
        }))
      }
    },
    select: selecaoEvento
  });

  return formatarEvento(evento);
}

//FUNÇÃO DE LISTAR EVENTOS DAS BANDAS DO MÚSICO
export async function listarEventos(idMusicoAutenticado: number) {
  const eventos = await prisma.evento.findMany({
    where: {
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoEvento,
    orderBy: [{ data: "asc" }, { idEvento: "asc" }]
  });

  return eventos.map(formatarEvento);
}

//FUNÇÃO DE BUSCAR EVENTO POR ID
export async function buscarEventoPorId(
  idEvento: number,
  idMusicoAutenticado: number
) {
  const evento = await prisma.evento.findFirst({
    where: {
      idEvento,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: selecaoEvento
  });

  if (!evento) {
    return null;
  }

  return formatarEvento(evento);
}

//FUNÇÃO DE ATUALIZAR EVENTO (SOMENTE O LÍDER DA BANDA)
export async function atualizarEvento(
  idEvento: number,
  dados: AtualizarEventoInput,
  idMusicoAutenticado: number
) {
  const existente = await prisma.evento.findFirst({
    where: {
      idEvento,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idEvento: true, idBanda: true }
  });

  if (!existente) {
    return null;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  const { idEquipamentos, idRepertorios, ...campos } = dados;

  const equipamentos =
    idEquipamentos !== undefined ? [...new Set(idEquipamentos)] : undefined;
  const repertorios =
    idRepertorios !== undefined ? [...new Set(idRepertorios)] : undefined;

  if (equipamentos !== undefined) {
    await validarEquipamentos(existente.idBanda, equipamentos);
  }

  if (repertorios !== undefined) {
    await validarRepertorios(existente.idBanda, repertorios);
  }

  const dadosAtualizados: {
    nome?: string;
    data?: Date;
    local?: string | null;
    descricao?: string | null;
  } = {};

  if (campos.nome !== undefined) {
    dadosAtualizados.nome = campos.nome;
  }

  if (campos.data !== undefined) {
    dadosAtualizados.data = campos.data;
  }

  if (campos.local !== undefined) {
    dadosAtualizados.local = campos.local;
  }

  if (campos.descricao !== undefined) {
    dadosAtualizados.descricao = campos.descricao;
  }

  const evento = await prisma.$transaction(async (tx) => {
    if (equipamentos !== undefined) {
      await tx.eventoEquipamento.deleteMany({ where: { idEvento } });

      if (equipamentos.length > 0) {
        await tx.eventoEquipamento.createMany({
          data: equipamentos.map((idEquipamento) => ({
            idEvento,
            idEquipamento
          }))
        });
      }
    }

    if (repertorios !== undefined) {
      await tx.eventoRepertorio.deleteMany({ where: { idEvento } });

      if (repertorios.length > 0) {
        await tx.eventoRepertorio.createMany({
          data: repertorios.map((idRepertorio) => ({
            idEvento,
            idRepertorio
          }))
        });
      }
    }

    return tx.evento.update({
      where: { idEvento },
      data: dadosAtualizados,
      select: selecaoEvento
    });
  });

  return formatarEvento(evento);
}

//FUNÇÃO DE DELETAR EVENTO (EXCLUSÃO LÓGICA)
export async function deletarEvento(
  idEvento: number,
  idMusicoAutenticado: number
) {
  const existente = await prisma.evento.findFirst({
    where: {
      idEvento,
      ativo: true,
      ...filtroAcesso(idMusicoAutenticado)
    },
    select: { idEvento: true, idBanda: true }
  });

  if (!existente) {
    return false;
  }

  await exigirLiderDaBanda(existente.idBanda, idMusicoAutenticado);

  await prisma.evento.update({
    where: { idEvento },
    data: { ativo: false }
  });

  return true;
}
