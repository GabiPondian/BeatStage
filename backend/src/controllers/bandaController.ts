import { RequestHandler } from "express";
import {
  cadastrarBanda,
  listarBandas,
  buscarBandaPorId,
  atualizarBanda,
  deletarBanda,
  entrarBandaPorCodigo
} from "../services/bandaService";

import { AtualizarBandaInput, EntrarBandaInput } from "../schemas/bandaSchema";
import { usuarioAutenticado } from "../middlewares/authMiddleware";

//CONTROLLER DE ENTRAR EM UMA BANDA POR CÓDIGO DE CONVITE
export const entrarBandaController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const { codigoConvite } = req.body as EntrarBandaInput;

    const banda = await entrarBandaPorCodigo(codigoConvite, idMusico);

    res.status(200).json({
      mensagem: "Você entrou na banda com sucesso",
      banda
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE CADASTRO DA BANDA
export const criarBanda: RequestHandler = async (req, res, next) => {
  try {
    //A IDENTIDADE DO LÍDER VEM DO TOKEN, NÃO DO CORPO DA REQUISIÇÃO
    const { idMusico } = usuarioAutenticado(req);
    const banda = await cadastrarBanda(req.body, idMusico);

    res.status(201).json({
      mensagem: "Banda cadastrada com sucesso",
      banda
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE LISTAR AS BANDAS DO MÚSICO AUTENTICADO
export const listarBandasController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);
    const bandas = await listarBandas(idMusico);

    res.status(200).json(bandas);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR BANDA POR ID
export const buscarBandaController: RequestHandler = async (req, res, next) => {
  try {
    const idBanda = Number(req.params.id);

    if (!Number.isInteger(idBanda) || idBanda <= 0) {
      res.status(400).json({
        mensagem: "Identificador de banda inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);
    const banda = await buscarBandaPorId(idBanda, idMusico);

    if (!banda) {
      res.status(404).json({
        mensagem: "Banda não encontrada"
      });
      return;
    }

    res.status(200).json(banda);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR BANDA (SOMENTE O LÍDER)
export const atualizarBandaController: RequestHandler = async (req, res, next) => {
  try {
    const idBanda = Number(req.params.id);

    if (!Number.isInteger(idBanda) || idBanda <= 0) {
      res.status(400).json({
        mensagem: "Identificador de banda inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    const banda = await atualizarBanda(
      idBanda,
      req.body as AtualizarBandaInput,
      idMusico
    );

    res.status(200).json({
      mensagem: "Banda atualizada com sucesso",
      banda
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR BANDA (EXCLUSÃO LÓGICA, SOMENTE O LÍDER)
export const deletarBandaController: RequestHandler = async (req, res, next) => {
  try {
    const idBanda = Number(req.params.id);

    if (!Number.isInteger(idBanda) || idBanda <= 0) {
      res.status(400).json({
        mensagem: "Identificador de banda inválido"
      });
      return;
    }

    const { idMusico } = usuarioAutenticado(req);

    await deletarBanda(idBanda, idMusico);

    res.status(200).json({
      mensagem: "Banda excluída com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};
