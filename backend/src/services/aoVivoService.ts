import prisma from "../lib/prisma";
import { AppError } from "../errors/AppError";
import type { MusicoAutenticado } from "../middlewares/authMiddleware";
import {
  buscarBandaDoMusico,
  exigirLiderDaBanda
} from "./acessoBandaService";
import {
  criarNotificacoes,
  type NovaNotificacao
} from "./notificacaoService";
import { publicarParaEvento } from "../lib/liveBus";
import type { AcaoAoVivo, CutucarInput } from "../schemas/aoVivoSchema";

const selecaoSetlist = {
  idRepertorio: true,
  musica: true,
  artista: true,
  tom: true,
  duracaoSegundos: true,
  observacao: true,
  musicos: {
    select: { idMusico: true, funcaoMusico: true },
    orderBy: { idMusico: "asc" }
  }
} as const;

type SetlistItem = {
  idRepertorio: number;
  musica: string;
  artista: string | null;
  tom: string | null;
  duracaoSegundos: number | null;
  observacao: string | null;
  musicos: { idMusico: number; funcaoMusico: string | null }[];
};

interface EventoComSetlist {
  idEvento: number;
  idBanda: number;
  nome: string;
  data: Date;
  banda: { nome: string };
  repertorios: { repertorio: SetlistItem }[];
}

interface SessaoAoVivo {
  idEvento: number;
  idBanda: number;
  idRepertorioAtual: number | null;
  status: string;
  iniciadoEm: Date | null;
  musicaIniciadaEm: Date | null;
  atualizadoEm: Date;
}

export interface EstadoAoVivo {
  idEvento: number;
  idBanda: number;
  nomeEvento: string;
  nomeBanda: string;
  dataEvento: string;
  status: "PARADO" | "RODANDO" | "ENCERRADO";
  idRepertorioAtual: number | null;
  iniciadoEm: string | null;
  musicaIniciadaEm: string | null;
  atualizadoEm: string | null;
  setlist: SetlistItem[];
}

function iso(valor: Date | null | undefined): string | null {
  return valor ? valor.toISOString() : null;
}

async function carregarEvento(
  idEvento: number,
  idMusico: number
): Promise<{ evento: EventoComSetlist; setlist: SetlistItem[] }> {
  const evento = (await prisma.evento.findFirst({
    where: { idEvento, ativo: true },
    select: {
      idEvento: true,
      idBanda: true,
      nome: true,
      data: true,
      banda: { select: { nome: true } },
      repertorios: {
        select: { repertorio: { select: selecaoSetlist } },
        orderBy: { idRepertorio: "asc" }
      }
    }
  })) as EventoComSetlist | null;

  if (!evento) {
    throw new AppError("Evento não encontrado", 404);
  }

  await buscarBandaDoMusico(evento.idBanda, idMusico);

  return {
    evento,
    setlist: evento.repertorios.map((item) => item.repertorio)
  };
}

function serializarEstado(
  evento: EventoComSetlist,
  setlist: SetlistItem[],
  sessao: SessaoAoVivo | null
): EstadoAoVivo {
  const ids = new Set(setlist.map((item) => item.idRepertorio));
  let idAtual = sessao?.idRepertorioAtual ?? null;

  if (idAtual !== null && !ids.has(idAtual)) {
    idAtual = null;
  }

  let status = (sessao?.status ?? "PARADO") as EstadoAoVivo["status"];

  if (status === "RODANDO" && idAtual === null) {
    status = "PARADO";
  }

  return {
    idEvento: evento.idEvento,
    idBanda: evento.idBanda,
    nomeEvento: evento.nome,
    nomeBanda: evento.banda.nome,
    dataEvento: evento.data.toISOString(),
    status,
    idRepertorioAtual: idAtual,
    iniciadoEm: iso(sessao?.iniciadoEm),
    musicaIniciadaEm: iso(sessao?.musicaIniciadaEm),
    atualizadoEm: iso(sessao?.atualizadoEm),
    setlist
  };
}

export async function buscarEstadoAoVivo(
  idEvento: number,
  idMusico: number
): Promise<EstadoAoVivo> {
  const { evento, setlist } = await carregarEvento(idEvento, idMusico);
  const sessao = await prisma.liveSessao.findUnique({
    where: { idEvento }
  });

  return serializarEstado(evento, setlist, sessao);
}

async function notificarEntradaNaMusica(params: {
  evento: EventoComSetlist;
  musica: SetlistItem;
  idMusicoAtor: number;
}): Promise<void> {
  const { evento, musica, idMusicoAtor } = params;

  const inscritos = await prisma.repertorioMusico.findMany({
    where: {
      idRepertorio: musica.idRepertorio,
      musico: { ativo: true }
    },
    select: { idMusico: true, funcaoMusico: true }
  });

  const banda = await prisma.banda.findUnique({
    where: { idBanda: evento.idBanda },
    select: {
      idLider: true,
      membros: { select: { idMusico: true } }
    }
  });

  if (!banda) return;

  const idsDaBanda = new Set([
    banda.idLider,
    ...banda.membros.map((membro) => membro.idMusico)
  ]);

  const destinatarios = inscritos.filter(
    (item) =>
      item.idMusico !== idMusicoAtor && idsDaBanda.has(item.idMusico)
  );

  if (destinatarios.length === 0) return;

  const entradas: NovaNotificacao[] = destinatarios.map((item) => ({
    idMusico: item.idMusico,
    idBanda: evento.idBanda,
    idEvento: evento.idEvento,
    idRepertorio: musica.idRepertorio,
    tipo: "ENTRADA",
    titulo: `Entrada em ${musica.musica}`,
    mensagem: `${item.funcaoMusico ? `Sua função: ${item.funcaoMusico}. ` : ""}Prepare-se para entrar em "${musica.musica}".`,
    bandaNome: evento.banda.nome,
    eventoNome: evento.nome,
    musica: musica.musica
  }));

  await criarNotificacoes(entradas);
}

export async function controlarAoVivo(
  idEvento: number,
  dados: { acao: AcaoAoVivo; idRepertorio?: number },
  musico: MusicoAutenticado
): Promise<EstadoAoVivo> {
  const { evento, setlist } = await carregarEvento(idEvento, musico.idMusico);
  await exigirLiderDaBanda(evento.idBanda, musico.idMusico);

  if (setlist.length === 0) {
    throw new AppError(
      "Vincule pelo menos uma música ao evento antes de abrir o palco",
      400
    );
  }

  const sessao = (await prisma.liveSessao.findUnique({
    where: { idEvento }
  })) as SessaoAoVivo | null;

  const ids = setlist.map((item) => item.idRepertorio);
  const agora = new Date();
  const idAnterior = sessao?.idRepertorioAtual ?? null;
  const indiceAnterior = idAnterior ? ids.indexOf(idAnterior) : -1;

  let indice = indiceAnterior;
  let status: EstadoAoVivo["status"] = "RODANDO";
  let iniciadoEm: Date | null = sessao?.iniciadoEm ?? agora;
  let musicaIniciadaEm: Date | null = sessao?.musicaIniciadaEm ?? agora;
  let notificar = false;
  const estavaRodando = sessao?.status === "RODANDO";

  switch (dados.acao) {
    case "INICIAR": {
      if (sessao?.status === "ENCERRADO") {
        indice = 0;
      } else if (indice < 0) {
        indice = 0;
      }

      if (!estavaRodando) {
        iniciadoEm = agora;
        musicaIniciadaEm = agora;
        notificar = true;
      }
      break;
    }

    case "REINICIAR": {
      indice = 0;
      iniciadoEm = agora;
      musicaIniciadaEm = agora;
      notificar = true;
      break;
    }

    case "SELECIONAR": {
      const solicitado = dados.idRepertorio;
      const encontrado = solicitado ? ids.indexOf(solicitado) : -1;

      if (encontrado < 0) {
        throw new AppError("A música informada não pertence a este evento", 400);
      }

      indice = encontrado;
      iniciadoEm = sessao?.iniciadoEm ?? agora;
      musicaIniciadaEm = agora;
      notificar = solicitado !== idAnterior;
      break;
    }

    case "PROXIMA": {
      indice = indice < 0 ? 0 : Math.min(indice + 1, ids.length - 1);
      iniciadoEm = sessao?.iniciadoEm ?? agora;

      if (ids[indice] !== idAnterior) {
        musicaIniciadaEm = agora;
        notificar = true;
      } else if (!estavaRodando) {
        musicaIniciadaEm = agora;
        notificar = true;
      }
      break;
    }

    case "ANTERIOR": {
      indice = indice <= 0 ? 0 : indice - 1;
      iniciadoEm = sessao?.iniciadoEm ?? agora;

      if (ids[indice] !== idAnterior) {
        musicaIniciadaEm = agora;
        notificar = true;
      } else if (!estavaRodando) {
        musicaIniciadaEm = agora;
        notificar = true;
      }
      break;
    }

    case "ENCERRAR": {
      status = "ENCERRADO";
      musicaIniciadaEm = null;
      break;
    }
  }

  const idAtual = dados.acao === "ENCERRAR" ? idAnterior : ids[indice] ?? null;

  const salva = (await prisma.liveSessao.upsert({
    where: { idEvento },
    create: {
      idEvento,
      idBanda: evento.idBanda,
      idRepertorioAtual: idAtual,
      status,
      iniciadoEm,
      musicaIniciadaEm
    },
    update: {
      idRepertorioAtual: idAtual,
      status,
      iniciadoEm,
      musicaIniciadaEm
    }
  })) as SessaoAoVivo;

  const estado = serializarEstado(evento, setlist, salva);
  publicarParaEvento(idEvento, "state", estado);

  if (notificar && idAtual !== null && estado.status === "RODANDO") {
    const musica = setlist.find((item) => item.idRepertorio === idAtual);

    if (musica) {
      await notificarEntradaNaMusica({
        evento,
        musica,
        idMusicoAtor: musico.idMusico
      });
    }
  }

  return estado;
}

export async function cutucarNoAoVivo(
  idEvento: number,
  dados: CutucarInput,
  musico: MusicoAutenticado
): Promise<number> {
  const { evento } = await carregarEvento(idEvento, musico.idMusico);

  const banda = await prisma.banda.findUnique({
    where: { idBanda: evento.idBanda },
    select: {
      idLider: true,
      membros: { select: { idMusico: true } }
    }
  });

  if (!banda) {
    throw new AppError("Banda não encontrada", 404);
  }

  const todosOsMusicos = new Set([
    banda.idLider,
    ...banda.membros.map((membro) => membro.idMusico)
  ]);

  let destinatarios: number[] = [];

  if (dados.idMusicoDestino !== undefined) {
    if (dados.idMusicoDestino === musico.idMusico) {
      throw new AppError("Você não pode cutucar a si mesmo", 400);
    }

    if (!todosOsMusicos.has(dados.idMusicoDestino)) {
      throw new AppError("O músico informado não participa desta banda", 403);
    }

    destinatarios = [dados.idMusicoDestino];
  } else {
    await exigirLiderDaBanda(evento.idBanda, musico.idMusico);
    destinatarios = [...todosOsMusicos].filter(
      (idMusico) => idMusico !== musico.idMusico
    );
  }

  const mensagem =
    dados.mensagem?.trim() || "Você é necessário no palco agora. Prepare-se!";

  const entradas: NovaNotificacao[] = destinatarios.map((idMusico) => ({
    idMusico,
    idBanda: evento.idBanda,
    idEvento: evento.idEvento,
    tipo: "CUTUCAR",
    titulo: `Cutucada de ${musico.nome}`,
    mensagem,
    bandaNome: evento.banda.nome,
    eventoNome: evento.nome
  }));

  return criarNotificacoes(entradas);
}
