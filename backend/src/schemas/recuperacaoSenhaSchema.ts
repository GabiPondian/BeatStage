import { z } from "zod";

//PEDIDO DE RECUPERAÇÃO (PÚBLICO)
export const esqueciSenhaSchema = z.object({
  email: z
    .string({ error: "Informe o e-mail" })
    .trim()
    .min(1, "Informe o e-mail")
    .email("Informe um e-mail válido")
    .max(255, "O e-mail deve ter no máximo 255 caracteres")
});

//REDEFINIÇÃO COM O TOKEN RECEBIDO POR E-MAIL (PÚBLICO)
export const redefinirSenhaSchema = z.object({
  token: z
    .string({ error: "Informe o código recebido por e-mail" })
    .trim()
    .min(32, "Código de recuperação inválido")
    .max(200, "Código de recuperação inválido"),
  novaSenha: z
    .string({ error: "Informe a nova senha" })
    .min(8, "A nova senha deve ter pelo menos 8 caracteres")
    .max(72, "A nova senha deve ter no máximo 72 caracteres")
});

export type EsqueciSenhaInput = z.infer<typeof esqueciSenhaSchema>;

export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;
