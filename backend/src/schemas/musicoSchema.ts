import { z } from "zod";

//A FOTO PODE SER UMA URL EXTERNA OU O CAMINHO DE UM ARQUIVO ENVIADO POR UPLOAD
const fotoPerfilSchema = z
  .string()
  .trim()
  .max(500, "O caminho da foto deve ter no máximo 500 caracteres")
  .refine(
    (valor) =>
      /^https?:\/\//i.test(valor) || /^\/uploads\/perfil\/[\w.-]+$/.test(valor),
    "Informe uma URL válida ou envie um arquivo de imagem"
  );

//CADASTRO DE MUSICO
export const musicoSchema = z.object({
  nome: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres").max(150),
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  cargo: z.string().trim().min(2, "Informe o cargo musical").max(150),
  fotoPerfil: fotoPerfilSchema.optional()
});

//ATUALIZAR MUSICO
//A SENHA NÃO ENTRA AQUI: A TROCA EXIGE A SENHA ATUAL E TEM ROTA PRÓPRIA
export const atualizarMusicoSchema = z.object({
  nome: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email().max(255).optional(),
  cargo: z.string().trim().min(2).max(150).optional(),
  fotoPerfil: fotoPerfilSchema.nullable().optional()
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