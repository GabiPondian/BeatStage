import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import { gerarToken } from "../lib/jwt";
import { LoginInput } from "../schemas/authSchema";

//FUNÇÃO DE LOGIN: VALIDA CREDENCIAIS E DEVOLVE O TOKEN + DADOS BÁSICOS
export async function login(dados: LoginInput) {
  const email = dados.email.toLowerCase();

  const musico = await prisma.musico.findUnique({
    where: { email },
    select: {
      idMusico: true,
      nome: true,
      email: true,
      cargo: true,
      fotoPerfil: true,
      ativo: true,
      senhaHash: true
    }
  });

  //MESMA MENSAGEM PARA E-MAIL INEXISTENTE E SENHA ERRADA (EVITA DESCOBRIR CONTAS)
  if (!musico) {
    throw new AppError("E-mail ou senha inválidos", 401);
  }

  const senhaConfere = await bcrypt.compare(dados.senha, musico.senhaHash);

  if (!senhaConfere) {
    throw new AppError("E-mail ou senha inválidos", 401);
  }

  if (!musico.ativo) {
    throw new AppError("Conta inativa", 403);
  }

  //O HASH DA SENHA NUNCA SAI DO BACKEND
  const dadosBasicos = {
    idMusico: musico.idMusico,
    nome: musico.nome,
    email: musico.email,
    cargo: musico.cargo,
    fotoPerfil: musico.fotoPerfil,
    ativo: musico.ativo
  };

  return {
    token: gerarToken(musico.idMusico),
    musico: dadosBasicos
  };
}
