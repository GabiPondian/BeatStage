import {
  API_BASE_URL,
  getStoredToken,
  UNAUTHORIZED_EVENT
} from "./api";

export type StreamEvento = (evento: string, dados: unknown) => void;

export interface ConexaoStream {
  close: () => void;
}

/**
 * Consome um endpoint SSE usando fetch, para enviar o Bearer token no header
 * (EventSource nativo não permite headers). Retorna uma função de limpeza.
 */
export function abrirStream(
  caminho: string,
  aoReceber: StreamEvento,
  aoFalhar?: (erro: Error) => void
): ConexaoStream {
  const controller = new AbortController();
  let encerrada = false;

  const executar = async () => {
    const token = getStoredToken();

    if (!token) {
      throw new Error("Sessão não encontrada");
    }

    const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!resposta.ok) {
      if (resposta.status === 401) {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }

      throw new Error(`Não foi possível abrir o canal em tempo real (${resposta.status}).`);
    }

    if (!resposta.body) {
      throw new Error("Canal em tempo real indisponível neste navegador.");
    }

    const leitor = resposta.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (!encerrada) {
      const { done, value } = await leitor.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      let separador = buffer.indexOf("\n\n");

      while (separador >= 0) {
        const bloco = buffer.slice(0, separador);
        buffer = buffer.slice(separador + 2);

        let nomeEvento = "message";
        const linhasDados: string[] = [];

        for (const linha of bloco.split("\n")) {
          if (linha.startsWith("event:")) {
            nomeEvento = linha.slice(6).trim();
          } else if (linha.startsWith("data:")) {
            linhasDados.push(linha.slice(5).trim());
          }
        }

        if (linhasDados.length > 0) {
          try {
            const dados = JSON.parse(linhasDados.join("\n")) as unknown;
            aoReceber(nomeEvento, dados);
          } catch {
            // Evento malformado é ignorado para não derrubar o stream.
          }
        }

        separador = buffer.indexOf("\n\n");
      }
    }

    if (!encerrada) {
      throw new Error("Conexão em tempo real encerrada.");
    }
  };

  void executar().catch((erro: unknown) => {
    if (encerrada) return;

    const normalizado =
      erro instanceof Error ? erro : new Error("Falha na conexão em tempo real");
    aoFalhar?.(normalizado);
  });

  return {
    close: () => {
      encerrada = true;
      controller.abort();
    }
  };
}
