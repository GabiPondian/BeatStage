import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";

//ARQUIVOS ENVIADOS FICAM FORA DO CÓDIGO-FONTE E SÃO SERVIDOS EM /uploads
//O CAMINHO RESOLVE IGUAL EM DESENVOLVIMENTO (src/lib) E EM PRODUÇÃO (dist/lib)
export const PASTA_UPLOADS = path.resolve(__dirname, "../../uploads");
export const PASTA_FOTOS_PERFIL = path.join(PASTA_UPLOADS, "perfil");

const TAMANHO_MAXIMO = 3 * 1024 * 1024;

//A EXTENSÃO VEM DO TIPO MIME, NUNCA DO NOME ENVIADO PELO CLIENTE
const EXTENSOES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif"
};

const armazenamento = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdir(PASTA_FOTOS_PERFIL, { recursive: true }, (erro) =>
      cb(erro, PASTA_FOTOS_PERFIL)
    );
  },
  filename(req, file, cb) {
    const extensao =
      EXTENSOES[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
    const idMusico = req.musico?.idMusico ?? "anon";
    const nome = `musico-${idMusico}-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}${extensao}`;

    cb(null, nome);
  }
});

const upload = multer({
  storage: armazenamento,
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
  fileFilter(_req, file, cb) {
    if (!EXTENSOES[file.mimetype]) {
      cb(new AppError("Envie uma imagem JPEG, PNG, WEBP ou GIF", 400));
      return;
    }

    cb(null, true);
  }
});

//MIDDLEWARE QUE RECEBE O ARQUIVO NO CAMPO "foto" E TRADUZ OS ERROS DO MULTER
export const receberFotoPerfil: RequestHandler = (req, res, next) => {
  upload.single("foto")(req, res, (erro: unknown) => {
    if (!erro) {
      next();
      return;
    }

    if (erro instanceof multer.MulterError) {
      if (erro.code === "LIMIT_FILE_SIZE") {
        next(new AppError("A imagem deve ter no máximo 3 MB", 400));
        return;
      }

      if (erro.code === "LIMIT_UNEXPECTED_FILE") {
        next(new AppError("Envie a imagem no campo \"foto\"", 400));
        return;
      }

      next(new AppError("Não foi possível receber a imagem", 400));
      return;
    }

    next(erro);
  });
};

//CAMINHO PÚBLICO GRAVADO NO BANCO
export function caminhoPublicoDaFoto(nomeArquivo: string): string {
  return `/uploads/perfil/${nomeArquivo}`;
}

//QUANDO O ARQUIVO ACOMPANHA O CADASTRO, ELE VIRA O CAMPO fotoPerfil DO BODY
//PRECISA RODAR ANTES DA VALIDAÇÃO DO SCHEMA
export const aplicarFotoNoBody: RequestHandler = (req, _res, next) => {
  if (req.file) {
    req.body.fotoPerfil = caminhoPublicoDaFoto(req.file.filename);
  }

  next();
};

//REMOVE A FOTO ANTERIOR APENAS QUANDO ELA VEIO DE UPLOAD
//URLS EXTERNAS (http://...) E O CAMPO VAZIO SÃO PRESERVADOS
export async function removerFotoAntiga(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/perfil/")) {
    return;
  }

  const arquivo = path.join(PASTA_FOTOS_PERFIL, path.basename(url));

  await fs.promises.unlink(arquivo).catch(() => undefined);
}
