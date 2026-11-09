import { Search, X } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  ariaLabel = "Buscar"
}: SearchInputProps) {
  return (
    <div className="search-input">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value ? (
        <button
          type="button"
          className="search-input__clear"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
