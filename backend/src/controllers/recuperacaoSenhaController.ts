import { RequestHandler } from "express";
import {
  redefinirSenhaComToken,
  solicitarRecuperacaoSenha
} from "../services/recuperacaoSenhaService";
import { RedefinirSenhaInput } from "../schemas/recuperacaoSenhaSchema";
import { emailConfigurado } from "../lib/mailer";

//PEDIDO DE LINK DE RECUPERAÇÃO
export const esqueciSenhaController: RequestHandler = async (req, res, next) => {
  try {
    const { email } = req.body as { email: string };

    const { enviado } = await solicitarRecuperacaoSenha(email);

    //A MENSAGEM NÃO REVELA SE O E-MAIL EXISTE NO SISTEMA
    res.status(200).json({
      mensagem:
        "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
      //SÓ INDICA O MODO DE DESENVOLVIMENTO QUANDO NENHUM SMTP ESTÁ CONFIGURADO
      emailEnviado: enviado,
      smtpConfigurado: emailConfigurado()
    });
  } catch (erro) {
    next(erro);
  }
};

//REDEFINIÇÃO DA SENHA COM O TOKEN
export const redefinirSenhaController: RequestHandler = async (req, res, next) => {
  try {
    await redefinirSenhaComToken(req.body as RedefinirSenhaInput);

    res.status(200).json({
      mensagem: "Senha redefinida com sucesso. Entre com a nova senha."
    });
  } catch (erro) {
    next(erro);
  }
};
