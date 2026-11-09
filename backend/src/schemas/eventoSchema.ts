import { z } from "zod";
import { dataSchema, idSchema } from "./comum";

//CADASTRO DE EVENTO
export const eventoSchema = z.object({
  idBanda: idSchema,
  nome: z
    .string({ error: "Informe o nome do evento" })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(150, "O nome deve ter no máximo 150 caracteres"),
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
    .optional(),
  idEquipamentos: z.array(idSchema).optional(),
  idRepertorios: z.array(idSchema).optional()
});

//ATUALIZAR EVENTO
export const atualizarEventoSchema = z
  .object({
    nome: z.string().trim().min(2).max(150).optional(),
    data: dataSchema.optional(),
    local: z.string().trim().min(2).max(255).nullable().optional(),
    descricao: z.string().trim().max(2000).nullable().optional(),
    idEquipamentos: z.array(idSchema).optional(),
    idRepertorios: z.array(idSchema).optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

export type EventoInput = z.infer<typeof eventoSchema>;

export type AtualizarEventoInput = z.infer<typeof atualizarEventoSchema>;
