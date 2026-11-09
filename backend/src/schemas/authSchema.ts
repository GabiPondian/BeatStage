import { z } from "zod";

//LOGIN
export const loginSchema = z.object({
  email: z
    .string({ error: "Informe o e-mail" })
    .trim()
    .min(1, "Informe o e-mail")
    .email("Informe um e-mail válido")
    .max(255, "O e-mail deve ter no máximo 255 caracteres"),
  senha: z
    .string({ error: "Informe a senha" })
    .min(1, "Informe a senha")
});

export type LoginInput = z.infer<typeof loginSchema>;
