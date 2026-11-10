import { z } from "zod";
import { idSchema } from "./comum";

//AÇÕES DO LÍDER NO MODO AO VIVO
export const acaoAoVivoSchema = z.enum(
  ["INICIAR", "SELECIONAR", "PROXIMA", "ANTERIOR", "REINICIAR", "ENCERRAR"],
  { error: "Informe uma ação válida para o modo ao vivo" }
);

export const controlarAoVivoSchema = z
  .object({
    acao: acaoAoVivoSchema,
    idRepertorio: idSchema.optional()
  })
  .refine(
    (dados) =>
      dados.acao !== "SELECIONAR" || dados.idRepertorio !== undefined,
    {
      message: "Informe a música que deve entrar no palco",
      path: ["idRepertorio"]
    }
  );

export const cutucarSchema = z.object({
  idMusicoDestino: idSchema.optional(),
  mensagem: z
    .string()
    .trim()
    .min(2, "A mensagem deve ter pelo menos 2 caracteres")
    .max(200, "A mensagem deve ter no máximo 200 caracteres")
    .optional()
});

export type AcaoAoVivo = z.infer<typeof acaoAoVivoSchema>;
export type ControlarAoVivoInput = z.infer<typeof controlarAoVivoSchema>;
export type CutucarInput = z.infer<typeof cutucarSchema>;
