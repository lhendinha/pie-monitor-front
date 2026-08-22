import ReactSelect from "react-select";
import { ALTURA_MAXIMA_MENU, SEM_INDICADORES } from "../../constants/select";
import { criarClassNames, estilosChip, estilosMenuPortal, semOpcoesDisponiveis } from "../../utils/select";
import type { Opcao } from "./types";

interface SelectProps {
  id?: string;
  opcoes: Opcao[];
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  /** Ver `MultiSelect` -- mesma variante, pro filtro de valor único. */
  variante?: "padrao" | "chip";
  compacto?: boolean;
}

/** Substitui o `<select>` nativo -- mesmo visual do `Select`/`MultiSelect`,
 * valor único. */
export function Select({
  id,
  opcoes,
  valor,
  onMudar,
  placeholder = "Selecione",
  compacto = false,
  variante = "padrao",
}: SelectProps) {
  const chip = variante === "chip";
  return (
    <ReactSelect<Opcao, false>
      unstyled
      inputId={id}
      options={opcoes}
      value={opcoes.find((o) => o.value === valor) ?? null}
      onChange={(opcao) => opcao && onMudar(opcao.value)}
      placeholder={placeholder}
      isSearchable={false}
      isClearable={false}
      openMenuOnFocus
      menuPlacement="auto"
      menuPosition="fixed"
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      styles={chip ? estilosChip(Boolean(valor)) : { menuPortal: estilosMenuPortal }}
      classNames={chip ? undefined : criarClassNames(compacto)}
      components={SEM_INDICADORES}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}
