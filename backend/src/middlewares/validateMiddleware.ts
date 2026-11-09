import { RequestHandler } from "express";
import { ZodType } from "zod";

export function validarBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);

    if (!resultado.success) {
      res.status(400).json({
        mensagem: "Dados inválidos",
        erros: resultado.error.issues.map((erro) => ({
          campo: erro.path.join("."),
          mensagem: erro.message
        }))
      });
      return;
    }

    req.body = resultado.data;
    next();
  };
}