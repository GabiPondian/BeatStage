import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { AlterarSenhaInput, AtualizarMusicoInput, MusicoInput } from "../schemas/musicoSchema";

//FUNÇÃO DE CADASTRO
export async function cadastrarMusico(dados: MusicoInput) {
  const email = dados.email.toLowerCase();
  const senhaHash = await bcrypt.hash(dados.senha, 10);

  const musico = await prisma.musico.create({
    data: {
      nome: dados.nome,
      email,
      senhaHash,
      cargo: dados.cargo,
      fotoPerfil: dados.fotoPerfil
    },
    select: {
      idMusico: true,
      nome: true,
      email: true,
      cargo: true,
      fotoPerfil: true
    }
  });

  return musico;
}

//FUNÇÃO DE LISTAR MUSICO
export async function listarMusicos() {
  return prisma.musico.findMany({
    where: { ativo: true },
    select: {
      idMusico: true,
      nome: true,
      email: true,
      cargo: true,
      fotoPerfil: true
    },
    orderBy: {
      idMusico: "asc"
    }
  });
}

//FUNÇÃO DE LISTAR MUSICO POR ID
export async function buscarMusicoPorId(idMusico: number) {
  return prisma.musico.findFirst({
    where: {
      idMusico,
      ativo: true
    },
    select: {
      idMusico: true,
      nome: true,
      email: true,
      cargo: true,
      fotoPerfil: true
    }
  });
}

//FUNÇÃO DE ATUALIZAR MUSICO
export async function atualizarMusico(
  idMusico: number,
  dados: AtualizarMusicoInput
) {
  const existente = await prisma.musico.findFirst({
    where: { idMusico, ativo: true }
  });

  if (!existente) {
    return null;
  }

  const dadosAtualizados: {
    nome?: string;
    email?: string;
    cargo?: string;
    fotoPerfil?: string | null;
  } = {};

  if (dados.nome !== undefined) {
    dadosAtualizados.nome = dados.nome;
  }

  if (dados.email !== undefined) {
    dadosAtualizados.email = dados.email.toLowerCase();
  }

  if (dados.cargo !== undefined) {
    dadosAtualizados.cargo = dados.cargo;
  }

  if (dados.fotoPerfil !== undefined) {
    dadosAtualizados.fotoPerfil = dados.fotoPerfil;
  }

  return prisma.musico.update({
    where: { idMusico },
    data: dadosAtualizados,
    select: {
      idMusico: true,
      nome: true,
      email: true,
      cargo: true,
      fotoPerfil: true
    }
  });
}

//FUNÇÃO DE DELETAR MUSICO (EXCLUSÃO LÓGICA: O REGISTRO PERMANECE NO BANCO)
export async function deletarMusico(idMusico: number) {
  const existente = await prisma.musico.findFirst({
    where: { idMusico, ativo: true },
    select: { idMusico: true }
  });

  if (!existente) {
    return false;
  }

  //UM LÍDER COM BANDA ATIVA NÃO PODE SER INATIVADO SEM ANTES RESOLVER A BANDA
  const bandaAtiva = await prisma.banda.findFirst({
    where: { idLider: idMusico, ativo: true },
    select: { idBanda: true, nome: true }
  });

  if (bandaAtiva) {
    throw new AppError(
      `Transfira a liderança ou exclua a banda "${bandaAtiva.nome}" antes de inativar o perfil`,
      409
    );
  }

  await prisma.musico.update({
    where: { idMusico },
    data: { ativo: false }
  });

  return true;
}

//FUNÇÃO DE ATUALIZAR SOMENTE A FOTO DE PERFIL (ARQUIVO ENVIADO POR UPLOAD)
//DEVOLVE A FOTO ANTERIOR PARA QUE O ARQUIVO ANTIGO POSSA SER REMOVIDO DO DISCO
export async function atualizarFotoPerfil(idMusico: number, urlFoto: string) {
  const existente = await prisma.musico.findFirst({
    where: { idMusico, ativo: true },
    select: { idMusico: true, fotoPerfil: true }
  });

  if (!existente) {
    return null;
  }

  const musico = await prisma.musico.update({
    where: { idMusico },
    data: { fotoPerfil: urlFoto },
    select: {
      idMusico: true,
      nome: true,
      email: true,
      cargo: true,
      fotoPerfil: true
    }
  });

  return { musico, fotoAnterior: existente.fotoPerfil };
}

//FUNÇÃO DE ALTERAR A SENHA DO MÚSICO AUTENTICADO
export async function alterarSenha(
  idMusico: number,
  dados: AlterarSenhaInput
) {
  const musico = await prisma.musico.findFirst({
    where: { idMusico, ativo: true },
    select: { senhaHash: true }
  });

  if (!musico) {
    throw new AppError("Músico não encontrado", 404);
  }

  const senhaConfere = await bcrypt.compare(dados.senhaAtual, musico.senhaHash);

  if (!senhaConfere) {
    throw new AppError("Senha atual incorreta", 401);
  }

  const senhaHash = await bcrypt.hash(dados.novaSenha, 10);

  await prisma.musico.update({
    where: { idMusico },
    data: { senhaHash }
  });
}