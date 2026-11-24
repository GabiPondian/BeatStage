
import { RequestHandler } from "express";
import {
  cadastrarMusico,
  listarMusicos,
  buscarMusicoPorId,
  atualizarMusico,
  atualizarFotoPerfil,
  deletarMusico,
  alterarSenha
} from "../services/musicoService";

import { usuarioAutenticado } from "../middlewares/authMiddleware";
import { caminhoPublicoDaFoto, removerFotoAntiga } from "../lib/upload";

import {
  AlterarSenhaInput,
  AtualizarMusicoInput
} from "../schemas/musicoSchema";

//CONTROLLER DE CADASTRO DO MUSICO
export const criarMusico: RequestHandler = async (req, res, next) => {
  try {
    const { musico, reativado, fotoAnterior } = await cadastrarMusico(req.body);

    //A FOTO ANTIGA DO PERFIL REATIVADO (SE FOI TROCADA) SAI DO DISCO
    await removerFotoAntiga(fotoAnterior);

    res.status(201).json({
      mensagem: reativado
        ? "Conta reativada com sucesso"
        : "Músico cadastrado com sucesso",
      musico
    });
  } catch (erro) {
    //O CADASTRO FALHOU: A FOTO ENVIADA NÃO PODE FICAR ÓRFÃ NO DISCO
    if (req.file) {
      await removerFotoAntiga(caminhoPublicoDaFoto(req.file.filename));
    }

    next(erro);
  }
};

//CONTROLLER DE LISTAR MUSICO
export const listarMusicosController: RequestHandler = async (_req, res, next) => {
  try {
    const musicos = await listarMusicos();

    res.status(200).json(musicos);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE BUSCAR MUSICO POR ID
export const buscarMusicoController: RequestHandler = async (req, res, next) => {
  try {
    const idMusico = Number(req.params.id);

    if (!Number.isInteger(idMusico) || idMusico <= 0) {
      res.status(400).json({
        mensagem: "Identificador de músico inválido"
      });
      return;
    }

    const musico = await buscarMusicoPorId(idMusico);

    if (!musico) {
      res.status(404).json({
        mensagem: "Músico não encontrado"
      });
      return;
    }

    res.status(200).json(musico);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR MUSICO
export const atualizarMusicoController: RequestHandler = async (req, res, next) => {
  try {
    const idMusico = Number(req.params.id);

    if (!Number.isInteger(idMusico) || idMusico <= 0) {
      res.status(400).json({
        mensagem: "Identificador de músico inválido"
      });
      return;
    }

    const musico = await atualizarMusico(
      idMusico,
      req.body as AtualizarMusicoInput
    );

    if (!musico) {
      res.status(404).json({
        mensagem: "Músico não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Músico atualizado com sucesso",
      musico
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE DELETAR MUSICO
export const deletarMusicoController: RequestHandler = async (req, res, next) => {
  try {
    const idMusico = Number(req.params.id);

    if (!Number.isInteger(idMusico) || idMusico <= 0) {
      res.status(400).json({
        mensagem: "Identificador de músico inválido"
      });
      return;
    }

    const deletado = await deletarMusico(idMusico);

    if (!deletado) {
      res.status(404).json({
        mensagem: "Músico não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Músico excluído com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE CONSULTAR O PERFIL DO MÚSICO AUTENTICADO
export const buscarPerfilController: RequestHandler = async (req, res, next) => {
  try {
    //A IDENTIDADE VEM DO TOKEN, NUNCA DE UM ID ENVIADO NA URL OU NO CORPO
    const musico = usuarioAutenticado(req);

    res.status(200).json(musico);
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ATUALIZAR O PERFIL DO MÚSICO AUTENTICADO
export const atualizarPerfilController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);

    const musico = await atualizarMusico(
      idMusico,
      req.body as AtualizarMusicoInput
    );

    if (!musico) {
      res.status(404).json({
        mensagem: "Músico não encontrado"
      });
      return;
    }

    res.status(200).json({
      mensagem: "Perfil atualizado com sucesso",
      musico
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ENVIAR A FOTO DE PERFIL (ARQUIVO MULTIPART NO CAMPO "foto")
export const enviarFotoPerfilController: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { idMusico } = usuarioAutenticado(req);

    if (!req.file) {
      res.status(400).json({
        mensagem: "Selecione uma imagem para enviar"
      });
      return;
    }

    const urlFoto = caminhoPublicoDaFoto(req.file.filename);

    const resultado = await atualizarFotoPerfil(idMusico, urlFoto);

    if (!resultado) {
      //O ARQUIVO JÁ ESTAVA NO DISCO: DESCARTA PARA NÃO DEIXAR LIXO
      await removerFotoAntiga(urlFoto);

      res.status(404).json({
        mensagem: "Músico não encontrado"
      });
      return;
    }

    //A FOTO ANTERIOR (SE FOI UPLOAD) DEIXA DE EXISTIR NO DISCO
    await removerFotoAntiga(resultado.fotoAnterior);

    res.status(200).json({
      mensagem: "Foto de perfil atualizada com sucesso",
      musico: resultado.musico
    });
  } catch (erro) {
    next(erro);
  }
};

//CONTROLLER DE ALTERAR A SENHA DO MÚSICO AUTENTICADO
export const alterarSenhaController: RequestHandler = async (req, res, next) => {
  try {
    const { idMusico } = usuarioAutenticado(req);

    await alterarSenha(idMusico, req.body as AlterarSenhaInput);

    res.status(200).json({
      mensagem: "Senha alterada com sucesso"
    });
  } catch (erro) {
    next(erro);
  }
};