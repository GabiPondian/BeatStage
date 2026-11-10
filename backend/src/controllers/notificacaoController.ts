import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import { usuarioAutenticado } from "../middlewares/authMiddleware";
import {
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas
} from "../services/notificacaoService";
import { assinarStream } from "../lib/liveBus";

export const listarNotificacoesController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const notificacoes = await listarNotificacoes(idMusico);

    res.status(200).json(notificacoes);
  } catch (erro) {
    next(erro);
  }
};

export const marcarNotificacaoLidaController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const idNotificacao = Number(req.params.id);

    if (!Number.isInteger(idNotificacao) || idNotificacao <= 0) {
      throw new AppError("Identificador de notificação inválido", 400);
    }

    const { idMusico } = usuarioAutenticado(req);
    await marcarNotificacaoLida(idNotificacao, idMusico);

    res.status(200).json({ mensagem: "Notificação marcada como lida" });
  } catch (erro) {
    next(erro);
  }
};

export const marcarTodasNotificacoesLidasController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const quantidade = await marcarTodasNotificacoesLidas(idMusico);

    res.status(200).json({
      mensagem: "Notificações marcadas como lidas",
      quantidade
    });
  } catch (erro) {
    next(erro);
  }
};

//STREAM SSE DE NOTIFICAÇÕES DO MÚSICO (ENTRADAS, CUTUCADAS E ALERTAS)
export const streamNotificacoesController: RequestHandler = (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    assinarStream(idMusico, res);
  } catch (erro) {
    next(erro);
  }
};
