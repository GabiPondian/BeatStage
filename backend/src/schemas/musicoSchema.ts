import { z } from "zod";

//CADASTRO DE MUSICO
export const musicoSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres").max(150),
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  cargo: z.string().trim().min(2, "Informe o cargo musical").max(150),
  fotoPerfil: z.string().trim().url("Informe uma URL válida para a foto").max(500).optional()
});

//ATUALIZAR MUSICO
//A SENHA NÃO ENTRA AQUI: A TROCA EXIGE A SENHA ATUAL E TEM ROTA PRÓPRIA
export const atualizarMusicoSchema = z.object({
  nome: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email().max(255).optional(),
  cargo: z.string().trim().min(2).max(150).optional(),
  fotoPerfil: z.string().trim().url().max(500).nullable().optional()
}).refine(
  (dados) => Object.values(dados).some((valor) => valor !== undefined),
  {
    message: "Informe pelo menos um campo para atualizar"
  }
);

//ALTERAR SENHA DO MÚSICO AUTENTICADO
export const alterarSenhaSchema = z
  .object({
    senhaAtual: z
      .string({ error: "Informe a senha atual" })
      .min(1, "Informe a senha atual"),
    novaSenha: z
      .string({ error: "Informe a nova senha" })
      .min(8, "A nova senha deve ter pelo menos 8 caracteres")
  })
  .refine((dados) => dados.novaSenha !== dados.senhaAtual, {
    message: "A nova senha deve ser diferente da senha atual",
    path: ["novaSenha"]
  });

export type AtualizarMusicoInput = z.infer<typeof atualizarMusicoSchema>;

export type AlterarSenhaInput = z.infer<typeof alterarSenhaSchema>;

export type MusicoInput = z.infer<typeof musicoSchema>;