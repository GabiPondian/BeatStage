import { RequestHandler } from "express";
import { login } from "../services/authService";

//CONTROLLER DE LOGIN
export const loginController: RequestHandler = async (req, res, next) => {
  try {
    const resultado = await login(req.body);

    res.status(200).json({
      mensagem: "Login realizado com sucesso",
      token: resultado.token,
      musico: resultado.musico
    });
  } catch (erro) {
    next(erro);
  }
};
