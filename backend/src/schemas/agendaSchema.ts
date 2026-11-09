import { z } from "zod";
import { dataSchema, horarioSchema, idSchema } from "./comum";

//ENUMERAÇÃO TIPO_AGENDA
export const tipoAgendaSchema = z.enum(["INDIVIDUAL", "BANDA"], {
  error: "Informe o tipo da agenda: INDIVIDUAL ou BANDA"
});

//CADASTRO DE AGENDA
export const agendaSchema = z.object({
  titulo: z
    .string({ error: "Informe o título da atividade" })
    .trim()
    .min(2, "O título deve ter pelo menos 2 caracteres")
    .max(150, "O título deve ter no máximo 150 caracteres"),
  descricao: z
    .string()
    .trim()
    .max(2000, "A descrição deve ter no máximo 2000 caracteres")
    .optional(),
  data: dataSchema,
  horario: horarioSchema,
  concluido: z.boolean().optional(),
  tipoAgenda: tipoAgendaSchema,
  visibilidade: tipoAgendaSchema.optional(),
  idBanda: idSchema.optional(),
  idEvento: idSchema.optional()
});

//ATUALIZAR AGENDA
export const atualizarAgendaSchema = z
  .object({
    titulo: z.string().trim().min(2).max(150).optional(),
    descricao: z.string().trim().max(2000).nullable().optional(),
    data: dataSchema.optional(),
    horario: horarioSchema.optional(),
    concluido: z.boolean().optional(),
    visibilidade: tipoAgendaSchema.optional(),
    idEvento: idSchema.nullable().optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

export type AgendaInput = z.infer<typeof agendaSchema>;

export type AtualizarAgendaInput = z.infer<typeof atualizarAgendaSchema>;
