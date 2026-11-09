import { Request, RequestHandler } from "express";
import prisma from "../lib/prisma";
import { verificarToken } from "../lib/jwt";
import { AppError } from "../errors/AppError";

//DADOS DO MÚSICO IDENTIFICADO PELO TOKEN (SEM SENHA E SEM HASH)
export interface MusicoAutenticado {
  idMusico: number;
  nome: string;
  email: string;
  cargo: string;
  fotoPerfil: string | null;
  ativo: boolean;
}

//USADO PELOS CONTROLLERS: A IDENTIDADE VEM SEMPRE DO TOKEN, NUNCA DO FRONTEND
export function usuarioAutenticado(req: Request): MusicoAutenticado {
  if (!req.musico) {
    throw new AppError("Músico não autenticado", 401);
  }

  return req.musico;
}

//MIDDLEWARE DE AUTENTICAÇÃO: PROTEGE AS ROTAS PRIVADAS
export const autenticar: RequestHandler = async (req, res, next) => {
  try {
    const cabecalho = req.headers.authorization;

    if (!cabecalho) {
      res.status(401).json({
        mensagem: "Token de acesso não informado"
      });
      return;
    }

    const correspondencia = /^Bearer\s+(.+)$/i.exec(cabecalho.trim());

    if (!correspondencia || !correspondencia[1]) {
      res.status(401).json({
        mensagem: "Token deve ser enviado no formato Bearer <token>"
      });
      return;
    }

    //LANÇA AppError 401 SE A ASSINATURA FOR INVÁLIDA OU O TOKEN ESTIVER EXPIRADO
    const { idMusico } = verificarToken(correspondencia[1]);

    const musico = await prisma.musico.findUnique({
      where: { idMusico },
      select: {
        idMusico: true,
        nome: true,
        email: true,
        cargo: true,
        fotoPerfil: true,
        ativo: true
      }
    });

    if (!musico) {
      res.status(401).json({
        mensagem: "Músico do token não encontrado"
      });
      return;
    }

    if (!musico.ativo) {
      res.status(403).json({
        mensagem: "Conta inativa"
      });
      return;
    }

    req.musico = musico;
    next();
  } catch (erro) {
    next(erro);
  }
};
