import { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/AppError";

export const errorMiddleware: ErrorRequestHandler = (erro, _req, res, _next) => {
  //CORPO DA REQUISIÇÃO COM JSON INVÁLIDO
  if (erro instanceof SyntaxError && "body" in erro) {
    res.status(400).json({
      mensagem: "Corpo da requisição não é um JSON válido"
    });
    return;
  }

  //ERROS DE REGRA DE NEGÓCIO LANÇADOS PELOS SERVICES
  if (erro instanceof AppError) {
    res.status(erro.statusCode).json({
      mensagem: erro.message
    });
    return;
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    //P2002 - VIOLAÇÃO DE CAMPO ÚNICO
    if (erro.code === "P2002") {
      const campos = Array.isArray(erro.meta?.target)
        ? (erro.meta?.target as string[])
        : [];

      if (campos.includes("codigoConvite")) {
        res.status(409).json({
          mensagem: "Já existe uma banda com esse código de convite"
        });
        return;
      }

      if (campos.includes("email")) {
        res.status(409).json({
          mensagem: "Já existe um músico cadastrado com esse e-mail"
        });
        return;
      }

      res.status(409).json({
        mensagem: "Já existe um cadastro com esses dados"
      });
      return;
    }

    //P2003 - VIOLAÇÃO DE CHAVE ESTRANGEIRA
    if (erro.code === "P2003") {
      res.status(409).json({
        mensagem:
          "Não é possível concluir a operação: o registro está relacionado a outros registros"
      });
      return;
    }

    //P2025 - REGISTRO NÃO ENCONTRADO
    if (erro.code === "P2025") {
      res.status(404).json({
        mensagem: "Registro não encontrado"
      });
      return;
    }

    //P2000 - VALOR MAIOR QUE A COLUNA PERMITE
    if (erro.code === "P2000") {
      res.status(400).json({
        mensagem: "Um dos valores informados é maior do que o permitido"
      });
      return;
    }
  }

  console.error(erro);

  res.status(500).json({
    mensagem: "Erro interno do servidor"
  });
};
