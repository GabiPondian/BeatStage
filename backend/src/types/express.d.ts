import type { MusicoAutenticado } from "../middlewares/authMiddleware";

//DISPONIBILIZA O MÚSICO AUTENTICADO EM req.musico
declare global {
  namespace Express {
    interface Request {
      musico?: MusicoAutenticado;
    }
  }
}

export {};
