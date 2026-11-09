//ERRO DE APLICAÇÃO COM STATUS HTTP
export class AppError extends Error {
  readonly statusCode: number;

  constructor(mensagem: string, statusCode = 400) {
    super(mensagem);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}
