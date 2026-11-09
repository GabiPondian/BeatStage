import { z } from "zod";

//IDENTIFICADOR NUMÉRICO POSITIVO
export const idSchema = z
  .number({ error: "Informe um identificador válido" })
  .int("O identificador deve ser um número inteiro")
  .positive("O identificador deve ser maior que zero");

//DATA (ACEITA "AAAA-MM-DD" OU ISO COMPLETO)
export const dataSchema = z.coerce.date({ error: "Informe uma data válida" });

//HORÁRIO NO FORMATO HH:MM
export const horarioSchema = z
  .string({ error: "Informe o horário" })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe o horário no formato HH:MM");

//TOM MUSICAL (ENUMERAÇÃO TOM_MUSICAL DO DOCUMENTO)
export const tomMusicalSchema = z.enum(
  [
    "C",
    "D",
    "E",
    "F",
    "G",
    "A",
    "B",
    "Cm",
    "Dm",
    "Em",
    "Fm",
    "Gm",
    "Am",
    "Bm",
    "C#",
    "D#",
    "F#",
    "G#",
    "A#",
    "C#m",
    "D#m",
    "F#m",
    "G#m",
    "A#m",
    "Cb",
    "Db",
    "Eb",
    "Fb",
    "Gb",
    "Ab",
    "Bb",
    "Cbm",
    "Dbm",
    "Ebm",
    "Fbm",
    "Gbm",
    "Abm",
    "Bbm"
  ],
  { error: "Informe um tom musical válido (ex.: C, Am, F#m, Bb)" }
);
