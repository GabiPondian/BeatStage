import "dotenv/config";

//CONFIGURAÇÃO DA AUTENTICAÇÃO (VALORES VÊM DO .env)
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "1h";

if (!jwtSecret) {
  throw new Error(
    "JWT_SECRET não configurado. Defina a variável JWT_SECRET no arquivo .env"
  );
}

if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET deve ter pelo menos 32 caracteres para ser considerado seguro"
  );
}

export const authConfig = {
  jwtSecret,
  jwtExpiresIn
} as const;
