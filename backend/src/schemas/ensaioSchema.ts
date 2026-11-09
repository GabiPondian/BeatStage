import { z } from "zod";
import { dataSchema, idSchema } from "./comum";

//CADASTRO DE ENSAIO
export const ensaioSchema = z.object({
  idBanda: idSchema,
  data: dataSchema,
  local: z
    .string()
    .trim()
    .min(2, "O local deve ter pelo menos 2 caracteres")
    .max(255, "O local deve ter no máximo 255 caracteres")
    .optional(),
  descricao: z
    .string()
    .trim()
    .max(2000, "A descrição deve ter no máximo 2000 caracteres")
    .optional()
});

//ATUALIZAR ENSAIO
export const atualizarEnsaioSchema = z
  .object({
    data: dataSchema.optional(),
    local: z.string().trim().min(2).max(255).nullable().optional(),
    descricao: z.string().trim().max(2000).nullable().optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

export type EnsaioInput = z.infer<typeof ensaioSchema>;

export type AtualizarEnsaioInput = z.infer<typeof atualizarEnsaioSchema>;
