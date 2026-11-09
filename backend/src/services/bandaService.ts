import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { AtualizarBandaInput, BandaInput } from "../schemas/bandaSchema";
import {
  buscarBandaDoMusico,
  exigirLiderDaBanda
} from "./acessoBandaService";

//CARACTERES USADOS NO CÓDIGO DE CONVITE (SEM 0/O E 1/I PARA EVITAR CONFUSÃO)
const ALFABETO_CODIGO_CONVITE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAMANHO_CODIGO_CONVITE = 8;
const MAX_TENTATIVAS_CODIGO = 5;

//CAMPOS DEVOLVIDOS PELA API (MEMBROS VIRAM UMA LISTA DE IDS)
const selecaoBanda = {
  idBanda: true,
  nome: true,
  descricao: true,
  codigoConvite: true,
  idLider: true,
  membros: {
    where: { musico: { ativo: true } },
    select: { idMusico: true },
    orderBy: { idMusico: "asc" }
  }
} satisfies Prisma.BandaSelect;

type BandaComMembros = Prisma.BandaGetPayload<{ select: typeof selecaoBanda }>;

function formatarBanda(banda: BandaComMembros) {
  return {
    idBanda: banda.idBanda,
    nome: banda.nome,
    descricao: banda.descricao,
    codigoConvite: banda.codigoConvite,
    idLider: banda.idLider,
    idMembros: banda.membros.map((membro) => membro.idMusico)
  };
}

//GERA UM CÓDIGO DE CONVITE ALEATÓRIO
function gerarCodigoConvite(): string {
  let codigo = "";

  for (let posicao = 0; posicao < TAMANHO_CODIGO_CONVITE; posicao += 1) {
    const indice = crypto.randomInt(ALFABETO_CODIGO_CONVITE.length);
    codigo += ALFABETO_CODIGO_CONVITE.charAt(indice);
  }

  return codigo;
}

//GERA UM CÓDIGO QUE AINDA NÃO EXISTE NO BANCO
async function gerarCodigoConviteUnico(): Promise<string> {
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS_CODIGO; tentativa += 1) {
    const codigo = gerarCodigoConvite();

    const existente = await prisma.banda.findUnique({
      where: { codigoConvite: codigo },
      select: { idBanda: true }
    });

    if (!existente) {
      return codigo;
    }
  }

  throw new AppError(
    "Não foi possível gerar um código de convite único, tente novamente",
    500
  );
}

//VERIFICA SE TODOS OS MÚSICOS INFORMADOS EXISTEM E ESTÃO ATIVOS
async function validarMembros(idsMembros: number[]) {
  if (idsMembros.length === 0) {
    return;
  }

  const encontrados = await prisma.musico.findMany({
    where: { idMusico: { in: idsMembros }, ativo: true },
    select: { idMusico: true }
  });

  if (encontrados.length === idsMembros.length) {
    return;
  }

  const idsEncontrados = new Set(encontrados.map((musico) => musico.idMusico));
  const ausentes = idsMembros.filter((id) => !idsEncontrados.has(id));

  throw new AppError(`Músico(s) não encontrado(s): ${ausentes.join(", ")}`, 404);
}

//VERIFICA SE O NOVO LÍDER EXISTE E ESTÁ ATIVO
async function validarLider(idLider: number) {
  const lider = await prisma.musico.findFirst({
    where: { idMusico: idLider, ativo: true },
    select: { idMusico: true }
  });

  if (!lider) {
    throw new AppError("Músico líder não encontrado", 404);
  }
}

//FUNÇÃO DE CADASTRO DE BANDA
//O idLider precisa ser o próprio músico autenticado: a identidade vem do token
export async function cadastrarBanda(
  dados: BandaInput,
  idMusicoAutenticado: number
) {
  if (dados.idLider !== idMusicoAutenticado) {
    throw new AppError("O líder da banda deve ser o músico autenticado", 403);
  }

  const idsMembros = [...new Set(dados.idMembros ?? [])];
  await validarMembros(idsMembros);

  const codigoConvite = await gerarCodigoConviteUnico();

  const banda = await prisma.banda.create({
    data: {
      nome: dados.nome,
      descricao: dados.descricao,
      codigoConvite,
      idLider: dados.idLider,
      membros: {
        create: idsMembros.map((idMusico) => ({ idMusico }))
      }
    },
    select: selecaoBanda
  });

  return formatarBanda(banda);
}

//FUNÇÃO DE LISTAR BANDAS DO MÚSICO AUTENTICADO
export async function listarBandas(idMusicoAutenticado: number) {
  const bandas = await prisma.banda.findMany({
    where: {
      ativo: true,
      OR: [
        { idLider: idMusicoAutenticado },
        { membros: { some: { idMusico: idMusicoAutenticado } } }
      ]
    },
    select: selecaoBanda,
    orderBy: { idBanda: "asc" }
  });

  return bandas.map(formatarBanda);
}

//FUNÇÃO DE BUSCAR BANDA POR ID (SÓ SE O MÚSICO PARTICIPAR DELA)
export async function buscarBandaPorId(
  idBanda: number,
  idMusicoAutenticado: number
) {
  await buscarBandaDoMusico(idBanda, idMusicoAutenticado);

  const banda = await prisma.banda.findFirst({
    where: { idBanda, ativo: true },
    select: selecaoBanda
  });

  if (!banda) {
    return null;
  }

  return formatarBanda(banda);
}

//FUNÇÃO DE ATUALIZAR BANDA (SOMENTE O LÍDER)
export async function atualizarBanda(
  idBanda: number,
  dados: AtualizarBandaInput,
  idMusicoAutenticado: number
) {
  await exigirLiderDaBanda(idBanda, idMusicoAutenticado);

  const { idMembros, ...campos } = dados;

  if (campos.idLider !== undefined && campos.idLider !== idMusicoAutenticado) {
    await validarLider(campos.idLider);
  }

  const idsMembros =
    idMembros !== undefined ? [...new Set(idMembros)] : undefined;

  if (idsMembros !== undefined) {
    await validarMembros(idsMembros);
  }

  const dadosAtualizados: {
    nome?: string;
    descricao?: string | null;
    idLider?: number;
  } = {};

  if (campos.nome !== undefined) {
    dadosAtualizados.nome = campos.nome;
  }

  if (campos.descricao !== undefined) {
    dadosAtualizados.descricao = campos.descricao;
  }

  if (campos.idLider !== undefined) {
    dadosAtualizados.idLider = campos.idLider;
  }

  const banda = await prisma.$transaction(async (tx) => {
    //SUBSTITUI A LISTA DE MEMBROS QUANDO idMembros É ENVIADO
    if (idsMembros !== undefined) {
      await tx.membroBanda.deleteMany({ where: { idBanda } });

      if (idsMembros.length > 0) {
        await tx.membroBanda.createMany({
          data: idsMembros.map((idMusico) => ({ idBanda, idMusico }))
        });
      }
    }

    return tx.banda.update({
      where: { idBanda },
      data: dadosAtualizados,
      select: selecaoBanda
    });
  });

  return formatarBanda(banda);
}

//FUNÇÃO DE ENTRAR EM UMA BANDA PELO CÓDIGO DE CONVITE
//O método entrarBanda(codigo) do diagrama de classes não tinha rota equivalente:
//as rotas existentes permitiam apenas o líder gerenciar a lista de membros.
export async function entrarBandaPorCodigo(
  codigoConvite: string,
  idMusicoAutenticado: number
) {
  const codigo = codigoConvite.trim().toUpperCase();

  const banda = await prisma.banda.findFirst({
    where: { codigoConvite: codigo, ativo: true },
    select: { idBanda: true, idLider: true }
  });

  if (!banda) {
    throw new AppError("Código de convite inválido ou banda inativa", 404);
  }

  if (banda.idLider === idMusicoAutenticado) {
    throw new AppError("Você já é o líder desta banda", 409);
  }

  const participacao = await prisma.membroBanda.findUnique({
    where: {
      idBanda_idMusico: {
        idBanda: banda.idBanda,
        idMusico: idMusicoAutenticado
      }
    },
    select: { idBanda: true }
  });

  if (participacao) {
    throw new AppError("Você já participa desta banda", 409);
  }

  await prisma.membroBanda.create({
    data: {
      idBanda: banda.idBanda,
      idMusico: idMusicoAutenticado
    }
  });

  const atualizada = await prisma.banda.findUniqueOrThrow({
    where: { idBanda: banda.idBanda },
    select: selecaoBanda
  });

  return formatarBanda(atualizada);
}

//FUNÇÃO DE DELETAR BANDA (EXCLUSÃO LÓGICA EM CASCATA)
export async function deletarBanda(
  idBanda: number,
  idMusicoAutenticado: number
) {
  await exigirLiderDaBanda(idBanda, idMusicoAutenticado);

  await prisma.$transaction([
    prisma.banda.update({
      where: { idBanda },
      data: { ativo: false }
    }),
    prisma.equipamento.updateMany({
      where: { idBanda },
      data: { ativo: false }
    }),
    prisma.ensaio.updateMany({
      where: { idBanda },
      data: { ativo: false }
    }),
    prisma.evento.updateMany({
      where: { idBanda },
      data: { ativo: false }
    }),
    prisma.repertorio.updateMany({
      where: { idBanda },
      data: { ativo: false }
    }),
    prisma.agenda.updateMany({
      where: { idBanda },
      data: { ativo: false }
    }),
    prisma.feedback.updateMany({
      where: { idBanda },
      data: { ativo: false }
    })
  ]);

  return true;
}
