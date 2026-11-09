import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { authConfig } from "../config/auth";
import { AppError } from "../errors/AppError";

//GERA O ACCESS TOKEN COM APENAS O IDENTIFICADOR DO MÚSICO, EMISSÃO E EXPIRAÇÃO
export function gerarToken(idMusico: number): string {
  const opcoes: SignOptions = {
    algorithm: "HS256",
    subject: String(idMusico),
    expiresIn: authConfig.jwtExpiresIn as SignOptions["expiresIn"]
  };

  return jwt.sign({}, authConfig.jwtSecret, opcoes);
}

//VALIDA ASSINATURA E EXPIRAÇÃO E DEVOLVE O IDENTIFICADOR DO MÚSICO
export function verificarToken(token: string): { idMusico: number } {
  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: ["HS256"]
    });
  } catch {
    throw new AppError("Token inválido ou expirado", 401);
  }

  const idMusico = Number(payload.sub);

  if (!Number.isInteger(idMusico) || idMusico <= 0) {
    throw new AppError("Token inválido ou expirado", 401);
  }

  return { idMusico };
}
