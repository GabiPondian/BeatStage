import { RequestHandler } from "express";
import {
  cadastrarRepertorio,
  listarRepertorios,
  buscarRepertorioPorId,
  atualizarRepertorio,
  deletarRepertorio
} from "../services/repertorioService";
import { AtualizarRepertorioInput } from "../schemas/repertorioSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE CADASTRO DE REPERTÓRIO
export const criarRepertorio: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const repertorio = await cadastrarRepertorio(req.body, idMusico);

    res.status(201).json({
      mensagem: "Repertório cadastrado com sucesso",
      repertorio
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR REPERTÓRIOS
export const listarRepertoriosController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const repertorios = await listarRepertorios(idMusico);

    res.status(200).json(repertorios);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR REPERTÓRIO POR ID
export const buscarRepertorioController: RequestHandler = async (req, res, next) => {
  try {
    const idRepertorio = Number(req.params.id);

    if (!Number.isInteger(idRepertorio) || idRepertorio <= 0) {
      res.status(400).json({
        mensagem: "Identificador de repertório inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const repertorio = await buscarRepertorioPorId(idRepertorio, idMusico);

    if (!repertorio) {
      res.status(404).json({
        mensagem: "Repertório não encontrado"
      });
      return;
    }

    res.status(200).json(repertorio);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR REPERTÓRIO
export const atualizarRepertorioController: RequestHandler = async (req, res, next) => {
  try {
    const idRepertorio = Number(req.params.id);

    if (!Number.isInteger(idRepertorio) || idRepertorio <= 0) {
      res.status(400).json({
        mensagem: "Identificador de repertório inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    const repertorio = await atualizarRepertorio(
      idRepertorio,
      req.body as AtualizarRepertorioInput,
      idMusico
    );

    if (!repertorio) {
      res.status(404).json({
        mensagem: "Repertório não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Repertório atualizado com sucesso",
      repertorio
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR REPERTÓRIO (EXCLUSÃO LÓGICA)
export const deletarRepertorioController: RequestHandler = async (req, res, next) => {
  try {
    const idRepertorio = Number(req.params.id);

    if (!Number.isInteger(idRepertorio) || idRepertorio <= 0) {
      res.status(400).json({
        mensagem: "Identificador de repertório inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const deletado = await deletarRepertorio(idRepertorio, idMusico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Repertório não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Repertório excluído com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
