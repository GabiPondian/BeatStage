import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Music2, Search, Clock } from "lucide-react";
import { Input } from "./Field";
import { musicasService, type SugestaoMusica } from "../../services/musicas.service";
import { formatDuration } from "../../lib/format";

interface MusicAutocompleteProps {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  onSelect: (sugestao: SugestaoMusica) => void;
  invalid?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

const ESPERA_MS = 350;

/**
 * Campo de nome da música com sugestões em tempo real.
 * Ao escolher uma sugestão, o formulário preenche artista, duração e tom.
 */
export function MusicAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  invalid,
  placeholder,
  autoFocus
}: MusicAutocompleteProps) {
  const [sugestoes, setSugestoes] = useState<SugestaoMusica[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listaId = useId();

  useEffect(() => {
    const termo = value.trim();
    if (termo.length < 2) {
      setSugestoes([]);
      setCarregando(false);
      setErro(null);
      return;
    }

    let cancelado = false;
    setCarregando(true);
    setErro(null);

    const timer = window.setTimeout(() => {
      musicasService
        .buscarSugestoes(termo)
        .then((resultado) => {
          if (cancelado) return;
          setSugestoes(resultado);
          setAtivo(resultado.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (cancelado) return;
          setSugestoes([]);
          setErro("Não foi possível buscar sugestões agora.");
        })
        .finally(() => {
          if (!cancelado) setCarregando(false);
        });
    }, ESPERA_MS);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  const visivel = aberto && value.trim().length >= 2;

  function selecionar(sugestao: SugestaoMusica) {
    onSelect(sugestao);
    setAberto(false);
    setAtivo(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setAberto(false);
      return;
    }

    if (!visivel || sugestoes.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAtivo((indice) => (indice + 1) % sugestoes.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setAtivo((indice) => (indice <= 0 ? sugestoes.length - 1 : indice - 1));
    } else if (event.key === "Enter" && ativo >= 0) {
      const escolhida = sugestoes[ativo];
      if (!escolhida) return;
      event.preventDefault();
      selecionar(escolhida);
    }
  }

  return (
    <div
      className="music-autocomplete"
      ref={containerRef}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setAberto(false);
        }
      }}
    >
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        invalid={invalid}
        icon={<Search size={15} />}
        autoComplete="off"
        role="combobox"
        aria-expanded={visivel}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={ativo >= 0 ? `${listaId}-${ativo}` : undefined}
        data-autofocus={autoFocus ? "" : undefined}
        onChange={(event) => {
          onChange(event.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={handleKeyDown}
      />

      {visivel ? (
        <div className="music-autocomplete__panel" id={listaId} role="listbox">
          {carregando ? (
            <p className="music-autocomplete__status">Buscando músicas…</p>
          ) : erro ? (
            <p className="music-autocomplete__status">{erro}</p>
          ) : sugestoes.length === 0 ? (
            <p className="music-autocomplete__status">
              Nenhuma música encontrada. Continue digitando ou preencha manualmente.
            </p>
          ) : (
            <ul className="music-autocomplete__list">
              {sugestoes.map((sugestao, indice) => (
                <li key={`${sugestao.id}-${indice}`}>
                  <button
                    type="button"
                    id={`${listaId}-${indice}`}
                    role="option"
                    aria-selected={indice === ativo}
                    className={`music-autocomplete__item ${indice === ativo ? "is-active" : ""}`}
                    onMouseEnter={() => setAtivo(indice)}
                    onClick={() => selecionar(sugestao)}
                  >
                    <span className="music-autocomplete__icon">
                      <Music2 size={15} />
                    </span>
                    <span className="music-autocomplete__text">
                      <strong>{sugestao.titulo}</strong>
                      <span>
                        {sugestao.artista}
                        {sugestao.album ? ` · ${sugestao.album}` : ""}
                      </span>
                    </span>
                    {sugestao.duracaoSegundos ? (
                      <span className="music-autocomplete__time">
                        <Clock size={12} />
                        {formatDuration(sugestao.duracaoSegundos)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="music-autocomplete__hint">
            Escolha uma música para preencher artista, duração e tom automaticamente.
          </p>
        </div>
      ) : null}
    </div>
  );
}
