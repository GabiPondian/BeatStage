import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import { PASTA_UPLOADS } from "./lib/upload";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

//ARQUIVOS ENVIADOS (FOTOS DE PERFIL) SERVIDOS PUBLICAMENTE
app.use("/uploads", express.static(PASTA_UPLOADS, { maxAge: "7d" }));

app.use("/api", routes);

//ROTA NÃO ENCONTRADA
app.use((_req, res) => {
  res.status(404).json({
    mensagem: "Rota não encontrada"
  });
});

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`BeatStage API rodando em http://localhost:${port}`);
});