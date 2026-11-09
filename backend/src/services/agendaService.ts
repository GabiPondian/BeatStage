import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { AgendaInput, AtualizarAgendaInput } from "../schemas/agendaSchema";
import type { MusicoAutenticado } from "../middlewares/authMiddleware";
import {
  buscarBandaDoMusico,
  exigirLiderDaBanda,
  idsBandasDoMusico
} from "./acessoBandaService";

//CAMPOS DEVOLVIDOS PELA API
const selecaoAgenda = {
  idAgenda: true,
  titulo: true,
  descricao: true,
  data: true,
  horario: true,
  concluido: true,
  criadoPor: true,
  tipoAgenda: true,
  visibilidade: true,
  idEvento: true,
  idBanda: true,
  idMusico: true
} as const;

//FILTRO DE LEITURA: AGENDA INDIVIDUAL SÓ DO DONO, AGENDA DE BANDA PARA OS MEMBROS
async function filtroLeitura(idMusico: number) {
  const idsBandas = await idsBandasDoMusico(idMusico);

  return {
    OR: [
      { visibilidade: "INDIVIDUAL" as const, idMusico },
      { visibilidade: "BANDA" as const, idBanda: { in: idsBandas } }
    ]
  };
}

//VALIDA O EVENTO VINCULADO (EXISTE, PARTICIPO DA BANDA E É DA MESMA BANDA)
async function validarEvento(
  idEvento: number,
  idMusico: number,
  idBandaAgenda: number | null
) {
  const evento = await prisma.evento.findFirst({
    where: { idEvento, ativo: true },
    select: { idBanda: true }
  });

  if (!evento) {
    throw new AppError("Evento não encontrado", 404);
  }

  await buscarBandaDoMusico(evento.idBanda, idMusico);

  if (idBandaAgenda !== null && evento.idBanda !== idBandaAgenda) {
    throw new AppError("O evento informado pertence a outra banda", 400);
  }

  return evento;
}

//FUNÇÃO DE CADASTRO DE AGENDA
export async function cadastrarAgenda(
  dados: AgendaInput,
  musico: MusicoAutenticado
) {
  const visibilidade =
    dados.visibilidade ??
    (dados.tipoAgenda === "BANDA" ? "BANDA" : "INDIVIDUAL");

  const idBanda = dados.idBanda ?? null;

  if (dados.tipoAgenda === "BANDA") {
    if (idBanda === null) {
      throw new AppError("Informe a banda da agenda", 400);
    }

    //AGENDA DE BANDA: SOMENTE O LÍDER CRIA
    await exigirLiderDaBanda(idBanda, musico.idMusico);
  } else if (idBanda !== null) {
    await buscarBandaDoMusico(idBanda, musico.idMusico);
  }

  if (visibilidade === "BANDA" && idBanda === null) {
    throw new AppError(
      "Agenda com visibilidade da banda precisa de idBanda",
      400
    );
  }

  const idEvento = dados.idEvento ?? null;

  if (idEvento !== null) {
    await validarEvento(idEvento, musico.idMusico, idBanda);
  }

  return prisma.agenda.create({
    data: {
      titulo: dados.titulo,
      descricao: dados.descricao,
      data: dados.data,
      horario: dados.horario,
      concluido: dados.concluido ?? false,
      criadoPor: musico.nome,
      tipoAgenda: dados.tipoAgenda,
      visibilidade,
      idBanda,
      idEvento,
      idMusico: musico.idMusico
    },
    select: selecaoAgenda
  });
}

//FUNÇÃO DE LISTAR AS AGENDAS VISÍVEIS PARA O MÚSICO
export async function listarAgendas(idMusico: number) {
  const filtro = await filtroLeitura(idMusico);

  return prisma.agenda.findMany({
    where: {
      ativo: true,
      ...filtro
    },
    select: selecaoAgenda,
    orderBy: [{ data: "asc" }, { horario: "asc" }]
  });
}

//FUNÇÃO DE BUSCAR AGENDA POR ID
export async function buscarAgendaPorId(idAgenda: number, idMusico: number) {
  const filtro = await filtroLeitura(idMusico);

  return prisma.agenda.findFirst({
    where: {
      idAgenda,
      ativo: true,
      ...filtro
    },
    select: selecaoAgenda
  });
}

//VERIFICA SE O MÚSICO PODE EDITAR A AGENDA (DONO OU LÍDER DA BANDA)
async function exigirPodeEditarAgenda(
  agenda: { tipoAgenda: "INDIVIDUAL" | "BANDA"; idBanda: number | null; idMusico: number | null },
  musico: MusicoAutenticado
) {
  if (agenda.tipoAgenda === "BANDA") {
    if (agenda.idBanda === null) {
      throw new AppError("Agenda de banda sem banda vinculada", 400);
    }

    await exigirLiderDaBanda(agenda.idBanda, musico.idMusico);
    return;
  }

  if (agenda.idMusico !== musico.idMusico) {
    throw new AppError(
      "Você só pode alterar as suas próprias agendas",
      403
    );
  }
}

//FUNÇÃO DE ATUALIZAR AGENDA
export async function atualizarAgenda(
  idAgenda: number,
  dados: AtualizarAgendaInput,
  musico: MusicoAutenticado
) {
  const existente = await buscarAgendaPorId(idAgenda, musico.idMusico);

  if (!existente) {
    return null;
  }

  await exigirPodeEditarAgenda(existente, musico);

  const visibilidade = dados.visibilidade ?? existente.visibilidade;

  if (visibilidade === "BANDA" && existente.idBanda === null) {
    throw new AppError(
      "Agenda com visibilidade da banda precisa de idBanda",
      400
    );
  }

  let idEvento: number | null | undefined;

  if (dados.idEvento !== undefined) {
    if (dados.idEvento === null) {
      idEvento = null;
    } else {
      await validarEvento(
        dados.idEvento,
        musico.idMusico,
        existente.idBanda
      );
      idEvento = dados.idEvento;
    }
  }

  const dadosAtualizados: {
    titulo?: string;
    descricao?: string | null;
    data?: Date;
    horario?: string;
    concluido?: boolean;
    visibilidade?: "INDIVIDUAL" | "BANDA";
    idEvento?: number | null;
  } = {};

  if (dados.titulo !== undefined) {
    dadosAtualizados.titulo = dados.titulo;
  }

  if (dados.descricao !== undefined) {
    dadosAtualizados.descricao = dados.descricao;
  }

  if (dados.data !== undefined) {
    dadosAtualizados.data = dados.data;
  }

  if (dados.horario !== undefined) {
    dadosAtualizados.horario = dados.horario;
  }

  if (dados.concluido !== undefined) {
    dadosAtualizados.concluido = dados.concluido;
  }

  if (dados.visibilidade !== undefined) {
    dadosAtualizados.visibilidade = dados.visibilidade;
  }

  if (idEvento !== undefined) {
    dadosAtualizados.idEvento = idEvento;
  }

  return prisma.agenda.update({
    where: { idAgenda },
    data: dadosAtualizados,
    select: selecaoAgenda
  });
}

//FUNÇÃO DE DELETAR AGENDA (EXCLUSÃO LÓGICA)
export async function deletarAgenda(
  idAgenda: number,
  musico: MusicoAutenticado
) {
  const existente = await buscarAgendaPorId(idAgenda, musico.idMusico);

  if (!existente) {
    return false;
  }

  await exigirPodeEditarAgenda(existente, musico);

  await prisma.agenda.update({
    where: { idAgenda },
    data: { ativo: false }
  });

  return true;
}
