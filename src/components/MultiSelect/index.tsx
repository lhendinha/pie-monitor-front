import { useEffect, useRef, useState } from "react";

interface Opcao {
  value: string;
  label: string;
}

interface MultiSelectProps {
  opcoes: Opcao[];
  selecionados: string[];
  onMudar: (valores: string[]) => void;
  placeholder?: string;
  id?: string;
}

/** Dropdown fechado com checkboxes -- mesmo visual do `.field select` de
 * papel único, mas permitindo múltipla seleção (substitui o `<select
 * multiple>` nativo, cujo listbox sempre aberto destoava do resto do form). */
export default function MultiSelect({ opcoes, selecionados, onMudar, placeholder = "Selecione", id }: MultiSelectProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function aoApertarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoApertarTecla);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoApertarTecla);
    };
  }, [aberto]);

  function alternar(value: string) {
    onMudar(selecionados.includes(value) ? selecionados.filter((v) => v !== value) : [...selecionados, value]);
  }

  const rotulo =
    selecionados.length === 0
      ? placeholder
      : selecionados.length <= 2
        ? opcoes
            .filter((o) => selecionados.includes(o.value))
            .map((o) => o.label)
            .join(", ")
        : `${selecionados.length} selecionados`;

  return (
    <div className="multi-select" ref={ref}>
      <button
        id={id}
        type="button"
        className="multi-select-trigger"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
      >
        <span className={selecionados.length === 0 ? "muted" : ""}>{rotulo}</span>
      </button>
      {aberto && (
        <div className="multi-select-painel" role="listbox">
          {opcoes.length === 0 ? (
            <div className="multi-select-vazio muted">Nenhuma opção disponível.</div>
          ) : (
            opcoes.map((o) => (
              <label className="multi-select-opcao" key={o.value}>
                <input type="checkbox" checked={selecionados.includes(o.value)} onChange={() => alternar(o.value)} />
                {o.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
