import { RequestHandler } from "express";
import {
  cadastrarEvento,
  listarEventos,
  buscarEventoPorId,
  atualizarEvento,
  deletarEvento
} from "../services/eventoService";
import { AtualizarEventoInput } from "../schemas/eventoSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE CADASTRO DE EVENTO
export const criarEvento: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const evento = await cadastrarEvento(req.body, idMusico);

    res.status(201).json({
      mensagem: "Evento cadastrado com sucesso",
      evento
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR EVENTOS
export const listarEventosController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const eventos = await listarEventos(idMusico);

    res.status(200).json(eventos);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR EVENTO POR ID
export const buscarEventoController: RequestHandler = async (req, res, next) => {
  try {
    const idEvento = Number(req.params.id);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      res.status(400).json({
        mensagem: "Identificador de evento inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const evento = await buscarEventoPorId(idEvento, idMusico);

    if (!evento) {
      res.status(404).json({
        mensagem: "Evento não encontrado"
      });
      return;
    }

    res.status(200).json(evento);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR EVENTO
export const atualizarEventoController: RequestHandler = async (req, res, next) => {
  try {
    const idEvento = Number(req.params.id);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      res.status(400).json({
        mensagem: "Identificador de evento inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    const evento = await atualizarEvento(
      idEvento,
      req.body as AtualizarEventoInput,
      idMusico
    );

    if (!evento) {
      res.status(404).json({
        mensagem: "Evento não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Evento atualizado com sucesso",
      evento
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR EVENTO (EXCLUSÃO LÓGICA)
export const deletarEventoController: RequestHandler = async (req, res, next) => {
  try {
    const idEvento = Number(req.params.id);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      res.status(400).json({
        mensagem: "Identificador de evento inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const deletado = await deletarEvento(idEvento, idMusico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Evento não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Evento excluído com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
