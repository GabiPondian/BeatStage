import { RequestHandler } from "express";
import {
  cadastrarEnsaio,
  listarEnsaios,
  buscarEnsaioPorId,
  atualizarEnsaio,
  deletarEnsaio
} from "../services/ensaioService";
import { AtualizarEnsaioInput } from "../schemas/ensaioSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE CADASTRO DE ENSAIO
export const criarEnsaio: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const ensaio = await cadastrarEnsaio(req.body, idMusico);

    res.status(201).json({
      mensagem: "Ensaio cadastrado com sucesso",
      ensaio
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR ENSAIOS
export const listarEnsaiosController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const ensaios = await listarEnsaios(idMusico);

    res.status(200).json(ensaios);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR ENSAIO POR ID
export const buscarEnsaioController: RequestHandler = async (req, res, next) => {
  try {
    const idEnsaio = Number(req.params.id);

    if (!Number.isInteger(idEnsaio) || idEnsaio <= 0) {
      res.status(400).json({
        mensagem: "Identificador de ensaio inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const ensaio = await buscarEnsaioPorId(idEnsaio, idMusico);

    if (!ensaio) {
      res.status(404).json({
        mensagem: "Ensaio não encontrado"
      });
      return;
    }

    res.status(200).json(ensaio);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR ENSAIO
export const atualizarEnsaioController: RequestHandler = async (req, res, next) => {
  try {
    const idEnsaio = Number(req.params.id);

    if (!Number.isInteger(idEnsaio) || idEnsaio <= 0) {
      res.status(400).json({
        mensagem: "Identificador de ensaio inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    const ensaio = await atualizarEnsaio(
      idEnsaio,
      req.body as AtualizarEnsaioInput,
      idMusico
    );

    if (!ensaio) {
      res.status(404).json({
        mensagem: "Ensaio não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Ensaio atualizado com sucesso",
      ensaio
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR ENSAIO (EXCLUSÃO LÓGICA)
export const deletarEnsaioController: RequestHandler = async (req, res, next) => {
  try {
    const idEnsaio = Number(req.params.id);

    if (!Number.isInteger(idEnsaio) || idEnsaio <= 0) {
      res.status(400).json({
        mensagem: "Identificador de ensaio inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const deletado = await deletarEnsaio(idEnsaio, idMusico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Ensaio não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Ensaio excluído com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
