import type { Response } from "express";

interface ClienteStream {
  id: number;
  idMusico: number;
  idEvento: number | null;
  resposta: Response;
  heartbeat: NodeJS.Timeout;
}

const clientes = new Set<ClienteStream>();
let proximoId = 1;

function enviar(cliente: ClienteStream, evento: string, dados: unknown): void {
  if (cliente.resposta.writableEnded || cliente.resposta.destroyed) {
    return;
  }

  try {
    cliente.resposta.write(`event: ${evento}\n`);
    cliente.resposta.write(`data: ${JSON.stringify(dados)}\n\n`);
  } catch {
    // O cliente pode ter desconectado entre a verificação e o write.
  }
}

/**
 * Registra uma conexão SSE. O mesmo músico pode ter mais de uma aba/dispositivo
 * conectado, inclusive uma conexão global (idEvento nulo) e uma do palco.
 */
export function assinarStream(
  idMusico: number,
  resposta: Response,
  idEvento: number | null = null
): void {
  resposta.status(200);
  resposta.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  resposta.setHeader("Cache-Control", "no-cache, no-transform");
  resposta.setHeader("Connection", "keep-alive");
  resposta.setHeader("X-Accel-Buffering", "no");
  resposta.flushHeaders();

  const heartbeat = setInterval(() => {
    if (!resposta.writableEnded && !resposta.destroyed) {
      resposta.write(": ping\n\n");
    }
  }, 20_000);

  const cliente: ClienteStream = {
    id: proximoId++,
    idMusico,
    idEvento,
    resposta,
    heartbeat
  };

  clientes.add(cliente);
  enviar(cliente, "connected", { idEvento });

  const limpar = () => {
    clearInterval(cliente.heartbeat);
    clientes.delete(cliente);
  };

  resposta.on("close", limpar);
  resposta.on("error", limpar);
}

/** Entrega uma notificação para todas as conexões do músico. */
export function publicarParaMusico(
  idMusico: number,
  evento: string,
  dados: unknown
): void {
  for (const cliente of clientes) {
    if (cliente.idMusico === idMusico) {
      enviar(cliente, evento, dados);
    }
  }
}

/** Entrega uma atualização de estado para quem está acompanhando o evento. */
export function publicarParaEvento(
  idEvento: number,
  evento: string,
  dados: unknown
): void {
  for (const cliente of clientes) {
    if (cliente.idEvento === idEvento) {
      enviar(cliente, evento, dados);
    }
  }
}
