import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/errorMiddleware";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

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