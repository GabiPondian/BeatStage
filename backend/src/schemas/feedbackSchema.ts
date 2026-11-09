import { z } from "zod";
import { idSchema } from "./comum";

//CADASTRO DE FEEDBACK
export const feedbackSchema = z.object({
  idBanda: idSchema,
  comentario: z
    .string({ error: "Informe o comentário" })
    .trim()
    .min(2, "O comentário deve ter pelo menos 2 caracteres")
    .max(2000, "O comentário deve ter no máximo 2000 caracteres"),
  anonimo: z.boolean().optional()
});

//ATUALIZAR FEEDBACK
export const atualizarFeedbackSchema = z
  .object({
    comentario: z.string().trim().min(2).max(2000).optional(),
    anonimo: z.boolean().optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export type AtualizarFeedbackInput = z.infer<typeof atualizarFeedbackSchema>;
