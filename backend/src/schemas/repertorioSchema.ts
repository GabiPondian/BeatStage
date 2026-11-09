import { z } from "zod";
import { idSchema, tomMusicalSchema } from "./comum";

//MÚSICO QUE TOCA A MÚSICA E A FUNÇÃO DELE
export const musicoRepertorioSchema = z.object({
  idMusico: idSchema,
  funcaoMusico: z
    .string()
    .trim()
    .min(2, "A função deve ter pelo menos 2 caracteres")
    .max(150, "A função deve ter no máximo 150 caracteres")
    .optional()
});

//CADASTRO DE REPERTÓRIO
export const repertorioSchema = z.object({
  idBanda: idSchema,
  musica: z
    .string({ error: "Informe o nome da música" })
    .trim()
    .min(2, "O nome da música deve ter pelo menos 2 caracteres")
    .max(200, "O nome da música deve ter no máximo 200 caracteres"),
  tom: tomMusicalSchema.optional(),
  duracaoSegundos: z
    .number({ error: "Informe a duração em segundos" })
    .int("A duração deve ser um número inteiro de segundos")
    .min(1, "A duração deve ser maior que zero")
    .max(7200, "A duração deve ter no máximo 2 horas")
    .optional(),
  observacao: z
    .string()
    .trim()
    .max(2000, "A observação deve ter no máximo 2000 caracteres")
    .optional(),
  musicos: z.array(musicoRepertorioSchema).optional()
});

//ATUALIZAR REPERTÓRIO
export const atualizarRepertorioSchema = z
  .object({
    musica: z.string().trim().min(2).max(200).optional(),
    tom: tomMusicalSchema.nullable().optional(),
    duracaoSegundos: z
      .number()
      .int("A duração deve ser um número inteiro de segundos")
      .min(1, "A duração deve ser maior que zero")
      .max(7200, "A duração deve ter no máximo 2 horas")
      .nullable()
      .optional(),
    observacao: z.string().trim().max(2000).nullable().optional(),
    musicos: z.array(musicoRepertorioSchema).optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

export type RepertorioInput = z.infer<typeof repertorioSchema>;

export type AtualizarRepertorioInput = z.infer<typeof atualizarRepertorioSchema>;
