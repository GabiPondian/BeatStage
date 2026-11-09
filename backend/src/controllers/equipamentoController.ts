import { RequestHandler } from "express";
import {
  cadastrarEquipamento,
  listarEquipamentos,
  buscarEquipamentoPorId,
  atualizarEquipamento,
  deletarEquipamento
} from "../services/equipamentoService";

import { AtualizarEquipamentoInput } from "../schemas/equipamentoSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE CADASTRO DO EQUIPAMENTO (SOMENTE O LÍDER DA BANDA)
export const criarEquipamento: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const equipamento = await cadastrarEquipamento(req.body, idMusico);

    res.status(201).json({
      mensagem: "Equipamento cadastrado com sucesso",
      equipamento
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR EQUIPAMENTOS DAS BANDAS DO MÚSICO
export const listarEquipamentosController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const equipamentos = await listarEquipamentos(idMusico);

    res.status(200).json(equipamentos);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR EQUIPAMENTO POR ID
export const buscarEquipamentoController: RequestHandler = async (req, res, next) => {
  try {
    const idEquipamento = Number(req.params.id);

    if (!Number.isInteger(idEquipamento) || idEquipamento <= 0) {
      res.status(400).json({
        mensagem: "Identificador de equipamento inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const equipamento = await buscarEquipamentoPorId(idEquipamento, idMusico);

    if (!equipamento) {
      res.status(404).json({
        mensagem: "Equipamento não encontrado"
      });
      return;
    }

    res.status(200).json(equipamento);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR EQUIPAMENTO (SOMENTE O LÍDER DA BANDA)
export const atualizarEquipamentoController: RequestHandler = async (req, res, next) => {
  try {
    const idEquipamento = Number(req.params.id);

    if (!Number.isInteger(idEquipamento) || idEquipamento <= 0) {
      res.status(400).json({
        mensagem: "Identificador de equipamento inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    const equipamento = await atualizarEquipamento(
      idEquipamento,
      req.body as AtualizarEquipamentoInput,
      idMusico
    );

    if (!equipamento) {
      res.status(404).json({
        mensagem: "Equipamento não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Equipamento atualizado com sucesso",
      equipamento
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR EQUIPAMENTO (EXCLUSÃO LÓGICA)
export const deletarEquipamentoController: RequestHandler = async (req, res, next) => {
  try {
    const idEquipamento = Number(req.params.id);

    if (!Number.isInteger(idEquipamento) || idEquipamento <= 0) {
      res.status(400).json({
        mensagem: "Identificador de equipamento inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const deletado = await deletarEquipamento(idEquipamento, idMusico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Equipamento não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Equipamento excluído com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
