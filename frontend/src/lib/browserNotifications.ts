export function notificacoesDoNavegadorDisponiveis(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissaoNotificacao(): NotificationPermission | "indisponivel" {
  if (!notificacoesDoNavegadorDisponiveis()) return "indisponivel";
  return Notification.permission;
}

export async function pedirPermissaoNotificacao(): Promise<
  NotificationPermission | "indisponivel"
> {
  if (!notificacoesDoNavegadorDisponiveis()) return "indisponivel";
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function mostrarNotificacaoNavegador(titulo: string, corpo: string): void {
  if (!notificacoesDoNavegadorDisponiveis()) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    new Notification(titulo, {
      body: corpo,
      icon: "/favicon.svg",
      tag: "beatstage-palco"
    });
  } catch {
    // Alguns navegadores móveis só permitem notificações via service worker.
  }
}
