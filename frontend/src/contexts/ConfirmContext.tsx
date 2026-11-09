import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ options, resolve });
      }),
    []
  );

  const close = useCallback(
    (value: boolean) => {
      setState((current) => {
        current?.resolve(value);
        return null;
      });
    },
    []
  );

  useEffect(() => {
    if (!state) return;

    confirmButton.current?.focus();

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };

    document.addEventListener("keydown", handler);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previousOverflow;
    };
  }, [state, close]);

  const options = state?.options;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options ? (
        <div className="modal-shell modal-shell--confirm" role="presentation">
          <div
            className="modal-backdrop"
            onClick={() => close(false)}
            aria-hidden="true"
          />
          <div
            className="modal confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <div className={`confirm-dialog__icon confirm-dialog__icon--${options.tone ?? "default"}`}>
              <AlertTriangle size={22} />
            </div>
            <h2 id="confirm-title">{options.title}</h2>
            <p id="confirm-message">{options.message}</p>
            <div className="modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => close(false)}
              >
                {options.cancelLabel ?? "Cancelar"}
              </button>
              <button
                ref={confirmButton}
                type="button"
                className={`btn ${options.tone === "danger" ? "btn--danger" : "btn--primary"}`}
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  }
  return context;
}
