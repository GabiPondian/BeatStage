import { RequestHandler } from "express";
import { usuarioAutenticado } from "./authMiddleware";

//AUTORIZAÇÃO: O MÚSICO SÓ PODE ALTERAR/EXCLUIR O PRÓPRIO CADASTRO
export const autorizarMusicoProprio: RequestHandler = (req, res, next) => {
  const idMusicoParam = Number(req.params.id);

  if (!Number.isInteger(idMusicoParam) || idMusicoParam <= 0) {
    res.status(400).json({
      mensagem: "Identificador de músico inválido"
    });
    return;
  }

  const { idMusico } = usuarioAutenticado(req);

  if (idMusicoParam !== idMusico) {
    res.status(403).json({
      mensagem: "Você só pode alterar ou excluir o seu próprio cadastro"
    });
    return;
  }

  next();
};
