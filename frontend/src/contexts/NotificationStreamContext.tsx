import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { abrirStream } from "../lib/stream";
import { mostrarNotificacaoNavegador } from "../lib/browserNotifications";
import { queryKeys } from "../hooks/queries";
import type { Notificacao } from "../types/api";

function pareceNotificacao(dados: unknown): dados is Notificacao {
  if (!dados || typeof dados !== "object") return false;
  const valor = dados as Partial<Notificacao>;
  return (
    typeof valor.idNotificacao === "number" &&
    typeof valor.titulo === "string" &&
    typeof valor.mensagem === "string"
  );
}

/**
 * Mantém um canal SSE aberto durante toda a sessão autenticada.
 * Cada notificação recebida atualiza a central de avisos e dispara um toast.
 * Se o canal cair, tenta reconectar em alguns segundos.
 */
export function NotificationStreamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let encerrado = false;
    let reconexao: number | undefined;
    let conexao: { close: () => void } | undefined;

    const conectar = () => {
      if (encerrado) return;

      conexao = abrirStream(
        "/notificacoes/stream",
        (evento, dados) => {
          if (evento !== "notification" || !pareceNotificacao(dados)) return;

          toast.push(
            dados.tipo === "ENTRADA" ? "info" : "success",
            dados.titulo,
            dados.mensagem
          );
          mostrarNotificacaoNavegador(dados.titulo, dados.mensagem);
          void queryClient.invalidateQueries({
            queryKey: queryKeys.notificacoes
          });
        },
        () => {
          if (encerrado) return;
          reconexao = window.setTimeout(conectar, 4000);
        }
      );
    };

    conectar();

    return () => {
      encerrado = true;
      conexao?.close();
      if (reconexao) window.clearTimeout(reconexao);
    };
  }, [user, toast, queryClient]);

  return <>{children}</>;
}
