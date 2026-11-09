import { z } from "zod";

//IDENTIFICADOR DE MÚSICO (LÍDER OU MEMBRO)
const idMusicoSchema = z
  .number({ error: "Informe um identificador de músico válido" })
  .int("O identificador do músico deve ser um número inteiro")
  .positive("O identificador do músico deve ser maior que zero");

//CADASTRO DE BANDA
export const bandaSchema = z.object({
  nome: z
    .string({ error: "Informe o nome da banda" })
    .trim()
    .min(2, "O nome deve ter pelo menos 2 caracteres")
    .max(150, "O nome deve ter no máximo 150 caracteres"),
  descricao: z
    .string()
    .trim()
    .max(2000, "A descrição deve ter no máximo 2000 caracteres")
    .optional(),
  idLider: idMusicoSchema,
  idMembros: z.array(idMusicoSchema).optional()
});

//ATUALIZAR BANDA
export const atualizarBandaSchema = z
  .object({
    nome: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres").max(150).optional(),
    descricao: z.string().trim().max(2000).nullable().optional(),
    idLider: idMusicoSchema.optional(),
    idMembros: z.array(idMusicoSchema).optional()
  })
  .refine(
    (dados) => Object.values(dados).some((valor) => valor !== undefined),
    {
      message: "Informe pelo menos um campo para atualizar"
    }
  );

//ENTRAR EM UMA BANDA EXISTENTE PELO CÓDIGO DE CONVITE (método entrarBanda(codigo) do diagrama)
export const entrarBandaSchema = z.object({
  codigoConvite: z
    .string({ error: "Informe o código de convite" })
    .trim()
    .min(1, "Informe o código de convite")
    .max(20, "O código de convite deve ter no máximo 20 caracteres")
});

export type BandaInput = z.infer<typeof bandaSchema>;

export type AtualizarBandaInput = z.infer<typeof atualizarBandaSchema>;

export type EntrarBandaInput = z.infer<typeof entrarBandaSchema>;
