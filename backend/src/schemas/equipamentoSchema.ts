import { z } from "zod";

//ESTADOS POSSÍVEIS DO EQUIPAMENTO (ENUMERAÇÃO EstadoEquipamento)
export const estadoEquipamentoSchema = z.enum(
  ["PROPRIO", "EMPRESTADO"],
  {
    error: "Informe um estado válido: PROPRIO ou EMPRESTADO"
  }
);

//CADASTRO DE EQUIPAMENTO
export const equipamentoSchema = z.object({
  nome: z
    .string({ error: "Informe o nome do equipamento" })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(150, "O nome deve ter no máximo 150 caracteres"),
  estado: estadoEquipamentoSchema,
  responsavel: z
    .string()
    .trim()
    .min(2, "O responsável deve ter pelo menos 2 caracteres")
    .max(150, "O responsável deve ter no máximo 150 caracteres")
    .optional(),
  descricao: z
    .string()
    .trim()
    .max(2000, "A descrição deve ter no máximo 2000 caracteres")
    .optional(),
  idBanda: z
    .number({ error: "Informe o identificador da banda" })
    .int("O identificador da banda deve ser um número inteiro")
    .positive("O identificador da banda deve ser maior que zero")
});

//ATUALIZAR EQUIPAMENTO
export const atualizarEquipamentoSchema = z
  .object({
    nome: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres").max(150).optional(),
    estado: estadoEquipamentoSchema.optional(),
    responsavel: z.string().trim().min(2).max(150).nullable().optional(),
    descricao: z.string().trim().max(2000).nullable().optional(),
    idBanda: z
      .number()
      .int("O identificador da banda deve ser um número inteiro")
      .positive("O identificador da banda deve ser maior que zero")
      .optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

export type EquipamentoInput = z.infer<typeof equipamentoSchema>;

export type AtualizarEquipamentoInput = z.infer<typeof atualizarEquipamentoSchema>;

export type EstadoEquipamento = z.infer<typeof estadoEquipamentoSchema>;
