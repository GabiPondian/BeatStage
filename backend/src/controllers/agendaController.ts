import { RequestHandler } from "express";
import {
  cadastrarAgenda,
  listarAgendas,
  buscarAgendaPorId,
  atualizarAgenda,
  deletarAgenda
} from "../services/agendaService";
import { AtualizarAgendaInput } from "../schemas/agendaSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE CADASTRO DE AGENDA
export const criarAgenda: RequestHandler = async (req, res, next) => {
  try {
    const musico = usuarioAutenticado(req);
    const agenda = await cadastrarAgenda(req.body, musico);

    res.status(201).json({
      mensagem: "Agenda cadastrada com sucesso",
      agenda
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR AGENDAS
export const listarAgendasController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const agendas = await listarAgendas(idMusico);

    res.status(200).json(agendas);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR AGENDA POR ID
export const buscarAgendaController: RequestHandler = async (req, res, next) => {
  try {
    const idAgenda = Number(req.params.id);

    if (!Number.isInteger(idAgenda) || idAgenda <= 0) {
      res.status(400).json({
        mensagem: "Identificador de agenda inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const agenda = await buscarAgendaPorId(idAgenda, idMusico);

    if (!agenda) {
      res.status(404).json({
        mensagem: "Agenda não encontrada"
      });
      return;
    }

    res.status(200).json(agenda);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR AGENDA
export const atualizarAgendaController: RequestHandler = async (req, res, next) => {
  try {
    const idAgenda = Number(req.params.id);

    if (!Number.isInteger(idAgenda) || idAgenda <= 0) {
      res.status(400).json({
        mensagem: "Identificador de agenda inválido"
      });
      return;
    }

    const musico = usuarioAutenticado(req);

    const agenda = await atualizarAgenda(
      idAgenda,
      req.body as AtualizarAgendaInput,
      musico
    );

    if (!agenda) {
      res.status(404).json({
        mensagem: "Agenda não encontrada"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Agenda atualizada com sucesso",
      agenda
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR AGENDA (EXCLUSÃO LÓGICA)
export const deletarAgendaController: RequestHandler = async (req, res, next) => {
  try {
    const idAgenda = Number(req.params.id);

    if (!Number.isInteger(idAgenda) || idAgenda <= 0) {
      res.status(400).json({
        mensagem: "Identificador de agenda inválido"
      });
      return;
    }

    const musico = usuarioAutenticado(req);
    const deletado = await deletarAgenda(idAgenda, musico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Agenda não encontrada"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Agenda excluída com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
