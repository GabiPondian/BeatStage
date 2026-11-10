import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import { usuarioAutenticado } from "../middlewares/authMiddleware";
import {
  buscarEstadoAoVivo,
  controlarAoVivo,
  cutucarNoAoVivo
} from "../services/aoVivoService";
import { assinarStream } from "../lib/liveBus";
import type {
  ControlarAoVivoInput,
  CutucarInput
} from "../schemas/aoVivoSchema";

function lerIdEvento(parametro: string | string[] | undefined): number {
  const idEvento = Number(parametro);

  if (!Number.isInteger(idEvento) || idEvento <= 0 || Array.isArray(parametro)) {
    throw new AppError("Identificador de evento inválido", 400);
  }

  return idEvento;
}

//CONSULTA O ESTADO ATUAL DO PALCO (MÚSICA ATUAL, STATUS E CONTADORES)
export const estadoAoVivoController: RequestHandler = async (req, res, next) => {
  try {
    const idEvento = lerIdEvento(req.params.idEvento);
    const { idMusico } = usuarioAutenticado(req);
    const estado = await buscarEstadoAoVivo(idEvento, idMusico);

    res.status(200).json(estado);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLA O PALCO (SOMENTE O LÍDER DA BANDA)
export const controlarAoVivoController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const idEvento = lerIdEvento(req.params.idEvento);
    const musico = usuarioAutenticado(req);
    const estado = await controlarAoVivo(
      idEvento,
      req.body as ControlarAoVivoInput,
      musico
    );

    res.status(200).json(estado);
  } catch (erro) {
    next(erro);
  }
};

//ENVIA UMA CUTUCADA/ALERTA PARA UM MÚSICO OU PARA A BANDA
export const cutucarAoVivoController: RequestHandler = async (req, res, next) => {
  try {
    const idEvento = lerIdEvento(req.params.idEvento);
    const musico = usuarioAutenticado(req);
    const enviados = await cutucarNoAoVivo(
      idEvento,
      req.body as CutucarInput,
      musico
    );

    res.status(200).json({
      mensagem: "Alerta enviado",
      enviados
    });
  } catch (erro) {
    next(erro);
  }
};

//STREAM SSE DO ESTADO DO PALCO PARA TODOS OS PARTICIPANTES DO EVENTO
export const streamAoVivoController: RequestHandler = async (req, res, next) => {
  try {
    const idEvento = lerIdEvento(req.params.idEvento);
    const { idMusico } = usuarioAutenticado(req);
    const estado = await buscarEstadoAoVivo(idEvento, idMusico);

    assinarStream(idMusico, res, idEvento);
    res.write(`event: state\ndata: ${JSON.stringify(estado)}\n\n`);
  } catch (erro) {
    next(erro);
  }
};
