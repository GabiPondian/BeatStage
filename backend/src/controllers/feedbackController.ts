import { RequestHandler } from "express";
import {
  cadastrarFeedback,
  listarFeedbacks,
  buscarFeedbackPorId,
  atualizarFeedback,
  deletarFeedback
} from "../services/feedbackService";
import { AtualizarFeedbackInput } from "../schemas/feedbackSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE CADASTRO DE FEEDBACK
export const criarFeedback: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const feedback = await cadastrarFeedback(req.body, idMusico);

    res.status(201).json({
      mensagem: "Feedback cadastrado com sucesso",
      feedback
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR FEEDBACKS
export const listarFeedbacksController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const feedbacks = await listarFeedbacks(idMusico);

    res.status(200).json(feedbacks);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR FEEDBACK POR ID
export const buscarFeedbackController: RequestHandler = async (req, res, next) => {
  try {
    const idFeedback = Number(req.params.id);

    if (!Number.isInteger(idFeedback) || idFeedback <= 0) {
      res.status(400).json({
        mensagem: "Identificador de feedback inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const feedback = await buscarFeedbackPorId(idFeedback, idMusico);

    if (!feedback) {
      res.status(404).json({
        mensagem: "Feedback não encontrado"
      });
      return;
    }

    res.status(200).json(feedback);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR FEEDBACK
export const atualizarFeedbackController: RequestHandler = async (req, res, next) => {
  try {
    const idFeedback = Number(req.params.id);

    if (!Number.isInteger(idFeedback) || idFeedback <= 0) {
      res.status(400).json({
        mensagem: "Identificador de feedback inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    const feedback = await atualizarFeedback(
      idFeedback,
      req.body as AtualizarFeedbackInput,
      idMusico
    );

    if (!feedback) {
      res.status(404).json({
        mensagem: "Feedback não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Feedback atualizado com sucesso",
      feedback
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR FEEDBACK (EXCLUSÃO LÓGICA)
export const deletarFeedbackController: RequestHandler = async (req, res, next) => {
  try {
    const idFeedback = Number(req.params.id);

    if (!Number.isInteger(idFeedback) || idFeedback <= 0) {
      res.status(400).json({
        mensagem: "Identificador de feedback inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const deletado = await deletarFeedback(idFeedback, idMusico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Feedback não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Feedback excluído com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
