import { Router } from "express";

//AUTENTICAÇÃO
import { loginController } from "./controllers/authController";
import {
  esqueciSenhaController,
  redefinirSenhaController
} from "./controllers/recuperacaoSenhaController";

//MÚSICO
import {
  criarMusico,
  listarMusicosController,
  buscarMusicoController,
  atualizarMusicoController,
  deletarMusicoController,
  buscarPerfilController,
  atualizarPerfilController,
  enviarFotoPerfilController,
  alterarSenhaController
} from "./controllers/musicoController";

//UPLOAD DE ARQUIVOS
import { receberFotoPerfil } from "./lib/upload";

//BANDA
import {
  criarBanda,
  listarBandasController,
  buscarBandaController,
  atualizarBandaController,
  deletarBandaController,
  entrarBandaController
} from "./controllers/bandaController";

//EQUIPAMENTO
import {
  criarEquipamento,
  listarEquipamentosController,
  buscarEquipamentoController,
  atualizarEquipamentoController,
  deletarEquipamentoController
} from "./controllers/equipamentoController";

//ENSAIO
import {
  criarEnsaio,
  listarEnsaiosController,
  buscarEnsaioController,
  atualizarEnsaioController,
  deletarEnsaioController
} from "./controllers/ensaioController";

//EVENTO
import {
  criarEvento,
  listarEventosController,
  buscarEventoController,
  atualizarEventoController,
  deletarEventoController
} from "./controllers/eventoController";

//REPERTÓRIO
import {
  criarRepertorio,
  listarRepertoriosController,
  buscarRepertorioController,
  atualizarRepertorioController,
  deletarRepertorioController
} from "./controllers/repertorioController";

//AGENDA
import {
  criarAgenda,
  listarAgendasController,
  buscarAgendaController,
  atualizarAgendaController,
  deletarAgendaController
} from "./controllers/agendaController";

//FEEDBACK
import {
  criarFeedback,
  listarFeedbacksController,
  buscarFeedbackController,
  atualizarFeedbackController,
  deletarFeedbackController
} from "./controllers/feedbackController";

//MODO AO VIVO
import {
  estadoAoVivoController,
  controlarAoVivoController,
  cutucarAoVivoController,
  streamAoVivoController
} from "./controllers/aoVivoController";

//NOTIFICAÇÕES
import {
  listarNotificacoesController,
  marcarNotificacaoLidaController,
  marcarTodasNotificacoesLidasController,
  streamNotificacoesController
} from "./controllers/notificacaoController";

import { validarBody } from "./middlewares/validateMiddleware";
import { autenticar } from "./middlewares/authMiddleware";
import { autorizarMusicoProprio } from "./middlewares/authorizationMiddleware";

import { loginSchema } from "./schemas/authSchema";
import {
  esqueciSenhaSchema,
  redefinirSenhaSchema
} from "./schemas/recuperacaoSenhaSchema";
import {
  musicoSchema,
  atualizarMusicoSchema,
  alterarSenhaSchema
} from "./schemas/musicoSchema";
import { bandaSchema, atualizarBandaSchema, entrarBandaSchema } from "./schemas/bandaSchema";
import {
  equipamentoSchema,
  atualizarEquipamentoSchema
} from "./schemas/equipamentoSchema";
import { ensaioSchema, atualizarEnsaioSchema } from "./schemas/ensaioSchema";
import { eventoSchema, atualizarEventoSchema } from "./schemas/eventoSchema";
import {
  repertorioSchema,
  atualizarRepertorioSchema
} from "./schemas/repertorioSchema";
import { agendaSchema, atualizarAgendaSchema } from "./schemas/agendaSchema";
import {
  feedbackSchema,
  atualizarFeedbackSchema
} from "./schemas/feedbackSchema";
import {
  controlarAoVivoSchema,
  cutucarSchema
} from "./schemas/aoVivoSchema";

const routes = Router();

// ==================== SAÚDE (HEALTH CHECK) ====================
//USADO POR SERVIÇOS DE HOSPEDAGEM (RENDER, ETC.) PARA VERIFICAR SE A API ESTÁ VIVA
routes.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", servico: "BeatStage API" });
});

// ==================== AUTENTICAÇÃO ====================

//ROTA DE LOGIN (PÚBLICA)
routes.post("/auth/login", validarBody(loginSchema), loginController);

//PEDIDO DE RECUPERAÇÃO DE SENHA POR E-MAIL (PÚBLICA)
routes.post(
  "/auth/esqueci-senha",
  validarBody(esqueciSenhaSchema),
  esqueciSenhaController
);

//REDEFINIÇÃO DE SENHA COM O TOKEN DO E-MAIL (PÚBLICA)
routes.post(
  "/auth/redefinir-senha",
  validarBody(redefinirSenhaSchema),
  redefinirSenhaController
);

// ==================== MÚSICO ====================

//ROTA DE CADASTRO DE MÚSICO (PÚBLICA: É O REGISTRO NO SISTEMA)
routes.post("/musicos", validarBody(musicoSchema), criarMusico);

//ROTAS DO PRÓPRIO PERFIL (A IDENTIDADE VEM DO TOKEN)
//PRECISAM VIR ANTES DE "/musicos/:id" PARA "perfil" NÃO SER LIDO COMO ID
routes.get("/musicos/perfil", autenticar, buscarPerfilController);

routes.patch(
  "/musicos/perfil",
  autenticar,
  validarBody(atualizarMusicoSchema),
  atualizarPerfilController
);

//ROTA DE ENVIAR A FOTO DE PERFIL (MULTIPART, CAMPO "foto")
//VEM ANTES DAS ROTAS COM ":id" PARA NÃO SER CONFUNDIDA COM UM ID
routes.post(
  "/musicos/perfil/foto",
  autenticar,
  receberFotoPerfil,
  enviarFotoPerfilController
);

routes.patch(
  "/musicos/perfil/senha",
  autenticar,
  validarBody(alterarSenhaSchema),
  alterarSenhaController
);

//ROTA DE LISTAR MÚSICOS
routes.get("/musicos", autenticar, listarMusicosController);

//ROTA DE BUSCAR MÚSICO POR ID
routes.get("/musicos/:id", autenticar, buscarMusicoController);

//ROTA DE ATUALIZAR MÚSICO (SOMENTE O PRÓPRIO CADASTRO)
routes.patch(
  "/musicos/:id",
  autenticar,
  autorizarMusicoProprio,
  validarBody(atualizarMusicoSchema),
  atualizarMusicoController
);

//ROTA DE DELETAR MÚSICO (EXCLUSÃO LÓGICA, SOMENTE O PRÓPRIO CADASTRO)
routes.delete(
  "/musicos/:id",
  autenticar,
  autorizarMusicoProprio,
  deletarMusicoController
);

// ==================== BANDA ====================

//ROTA DE CADASTRO DE BANDA
routes.post("/bandas", autenticar, validarBody(bandaSchema), criarBanda);

//ROTA DE ENTRAR EM UMA BANDA PELO CÓDIGO DE CONVITE
routes.post(
  "/bandas/entrar",
  autenticar,
  validarBody(entrarBandaSchema),
  entrarBandaController
);

//ROTA DE LISTAR AS BANDAS DO MÚSICO
routes.get("/bandas", autenticar, listarBandasController);

//ROTA DE BUSCAR BANDA POR ID
routes.get("/bandas/:id", autenticar, buscarBandaController);

//ROTA DE ATUALIZAR BANDA (SOMENTE O LÍDER)
routes.patch(
  "/bandas/:id",
  autenticar,
  validarBody(atualizarBandaSchema),
  atualizarBandaController
);

//ROTA DE DELETAR BANDA (EXCLUSÃO LÓGICA, SOMENTE O LÍDER)
routes.delete("/bandas/:id", autenticar, deletarBandaController);

// ==================== EQUIPAMENTO ====================

//ROTA DE CADASTRO DE EQUIPAMENTO (SOMENTE O LÍDER)
routes.post(
  "/equipamentos",
  autenticar,
  validarBody(equipamentoSchema),
  criarEquipamento
);

//ROTA DE LISTAR EQUIPAMENTOS DAS BANDAS DO MÚSICO
routes.get("/equipamentos", autenticar, listarEquipamentosController);

//ROTA DE BUSCAR EQUIPAMENTO POR ID
routes.get("/equipamentos/:id", autenticar, buscarEquipamentoController);

//ROTA DE ATUALIZAR EQUIPAMENTO (SOMENTE O LÍDER)
routes.patch(
  "/equipamentos/:id",
  autenticar,
  validarBody(atualizarEquipamentoSchema),
  atualizarEquipamentoController
);

//ROTA DE DELETAR EQUIPAMENTO (EXCLUSÃO LÓGICA)
routes.delete("/equipamentos/:id", autenticar, deletarEquipamentoController);

// ==================== ENSAIO ====================

//ROTA DE CADASTRO DE ENSAIO (SOMENTE O LÍDER)
routes.post("/ensaios", autenticar, validarBody(ensaioSchema), criarEnsaio);

//ROTA DE LISTAR ENSAIOS
routes.get("/ensaios", autenticar, listarEnsaiosController);

//ROTA DE BUSCAR ENSAIO POR ID
routes.get("/ensaios/:id", autenticar, buscarEnsaioController);

//ROTA DE ATUALIZAR ENSAIO (SOMENTE O LÍDER)
routes.patch(
  "/ensaios/:id",
  autenticar,
  validarBody(atualizarEnsaioSchema),
  atualizarEnsaioController
);

//ROTA DE DELETAR ENSAIO (EXCLUSÃO LÓGICA)
routes.delete("/ensaios/:id", autenticar, deletarEnsaioController);

// ==================== EVENTO ====================

//ROTA DE CADASTRO DE EVENTO (SOMENTE O LÍDER)
routes.post("/eventos", autenticar, validarBody(eventoSchema), criarEvento);

//ROTA DE LISTAR EVENTOS
routes.get("/eventos", autenticar, listarEventosController);

//ROTA DE BUSCAR EVENTO POR ID
routes.get("/eventos/:id", autenticar, buscarEventoController);

//ROTA DE ATUALIZAR EVENTO (SOMENTE O LÍDER)
routes.patch(
  "/eventos/:id",
  autenticar,
  validarBody(atualizarEventoSchema),
  atualizarEventoController
);

//ROTA DE DELETAR EVENTO (EXCLUSÃO LÓGICA)
routes.delete("/eventos/:id", autenticar, deletarEventoController);

// ==================== REPERTÓRIO ====================

//ROTA DE CADASTRO DE REPERTÓRIO (SOMENTE O LÍDER)
routes.post(
  "/repertorios",
  autenticar,
  validarBody(repertorioSchema),
  criarRepertorio
);

//ROTA DE LISTAR REPERTÓRIOS
routes.get("/repertorios", autenticar, listarRepertoriosController);

//ROTA DE BUSCAR REPERTÓRIO POR ID
routes.get("/repertorios/:id", autenticar, buscarRepertorioController);

//ROTA DE ATUALIZAR REPERTÓRIO (SOMENTE O LÍDER)
routes.patch(
  "/repertorios/:id",
  autenticar,
  validarBody(atualizarRepertorioSchema),
  atualizarRepertorioController
);

//ROTA DE DELETAR REPERTÓRIO (EXCLUSÃO LÓGICA)
routes.delete("/repertorios/:id", autenticar, deletarRepertorioController);

// ==================== AGENDA ====================

//ROTA DE CADASTRO DE AGENDA (INDIVIDUAL OU DA BANDA)
routes.post("/agendas", autenticar, validarBody(agendaSchema), criarAgenda);

//ROTA DE LISTAR AGENDAS VISÍVEIS
routes.get("/agendas", autenticar, listarAgendasController);

//ROTA DE BUSCAR AGENDA POR ID
routes.get("/agendas/:id", autenticar, buscarAgendaController);

//ROTA DE ATUALIZAR AGENDA
routes.patch(
  "/agendas/:id",
  autenticar,
  validarBody(atualizarAgendaSchema),
  atualizarAgendaController
);

//ROTA DE DELETAR AGENDA (EXCLUSÃO LÓGICA)
routes.delete("/agendas/:id", autenticar, deletarAgendaController);

// ==================== FEEDBACK ====================

//ROTA DE CADASTRO DE FEEDBACK (PARTICIPANTES DA BANDA)
routes.post("/feedbacks", autenticar, validarBody(feedbackSchema), criarFeedback);

//ROTA DE LISTAR FEEDBACKS
routes.get("/feedbacks", autenticar, listarFeedbacksController);

//ROTA DE BUSCAR FEEDBACK POR ID
routes.get("/feedbacks/:id", autenticar, buscarFeedbackController);

//ROTA DE ATUALIZAR FEEDBACK (AUTOR OU LÍDER)
routes.patch(
  "/feedbacks/:id",
  autenticar,
  validarBody(atualizarFeedbackSchema),
  atualizarFeedbackController
);

//ROTA DE DELETAR FEEDBACK (EXCLUSÃO LÓGICA, AUTOR OU LÍDER)
routes.delete("/feedbacks/:id", autenticar, deletarFeedbackController);

// ==================== MODO AO VIVO ====================

//ESTADO ATUAL DO PALCO (QUALQUER PARTICIPANTE DO EVENTO)
routes.get("/ao-vivo/:idEvento", autenticar, estadoAoVivoController);

//STREAM SSE DO ESTADO DO PALCO
routes.get("/ao-vivo/:idEvento/stream", autenticar, streamAoVivoController);

//CONTROLE DO PALCO (SOMENTE O LÍDER DA BANDA)
routes.patch(
  "/ao-vivo/:idEvento",
  autenticar,
  validarBody(controlarAoVivoSchema),
  controlarAoVivoController
);

//CUTUCAR/ALERTAR UM MÚSICO (OU A BANDA INTEIRA, SE LÍDER)
routes.post(
  "/ao-vivo/:idEvento/cutucar",
  autenticar,
  validarBody(cutucarSchema),
  cutucarAoVivoController
);

// ==================== NOTIFICAÇÕES ====================

//STREAM SSE DE NOTIFICAÇÕES DO MÚSICO
routes.get("/notificacoes/stream", autenticar, streamNotificacoesController);

//MARCAR TODAS COMO LIDAS (ANTES DE "/:id/lida")
routes.patch(
  "/notificacoes/lidas",
  autenticar,
  marcarTodasNotificacoesLidasController
);

//LISTAR NOTIFICAÇÕES DO MÚSICO
routes.get("/notificacoes", autenticar, listarNotificacoesController);

//MARCAR UMA NOTIFICAÇÃO COMO LIDA
routes.patch(
  "/notificacoes/:id/lida",
  autenticar,
  marcarNotificacaoLidaController
);

export default routes;
