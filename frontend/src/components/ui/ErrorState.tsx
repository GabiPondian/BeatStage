import { RefreshCw, WifiOff } from "lucide-react";
import { mensagemDeErro } from "../../lib/api";
import { Button } from "./Button";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ error, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div className={`error-state ${compact ? "error-state--compact" : ""}`.trim()}>
      <span className="error-state__icon">
        <WifiOff size={22} />
      </span>
      <div>
        <strong>Não foi possível carregar os dados</strong>
        <p>{mensagemDeErro(error)}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
