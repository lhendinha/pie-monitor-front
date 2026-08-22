import ReactSelect from "react-select";
import { ALTURA_MAXIMA_MENU, SEM_INDICADORES } from "../../constants/select";
import { criarClassNames, estilosChip, estilosMenuPortal, semOpcoesDisponiveis } from "../../utils/select";
import { OpcaoComCheckbox } from "./OpcaoComCheckbox";
import { ResumoSelecionados } from "./ResumoSelecionados";
import type { Opcao } from "./types";

interface MultiSelectProps {
  id?: string;
  opcoes: Opcao[];
  selecionados: string[];
  onMudar: (valores: string[]) => void;
  placeholder?: string;
  /** "chip" desenha o controle como a pílula de filtro do artifact.
   *
   * O rótulo mostra a seleção -- é o `ResumoSelecionados` (ValueContainer
   * já existente no projeto) que troca as tags padrão por texto: um nome
   * quando é um só, "N selecionados" quando são muitos. É por isso que o
   * artifact não precisa de chips removíveis embaixo da barra. */
  variante?: "padrao" | "chip";
}

/** Dropdown fechado com checkboxes -- mesmo visual do `Select` de valor
 * único, mas permitindo múltipla seleção. */
export function MultiSelect({
  id,
  opcoes,
  selecionados,
  onMudar,
  placeholder = "Selecione",
  variante = "padrao",
}: MultiSelectProps) {
  const chip = variante === "chip";
  return (
    <ReactSelect<Opcao, true>
      isMulti
      unstyled
      inputId={id}
      options={opcoes}
      value={opcoes.filter((o) => selecionados.includes(o.value))}
      onChange={(valores) => onMudar(valores.map((o) => o.value))}
      placeholder={placeholder}
      isSearchable={false}
      isClearable={false}
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      openMenuOnFocus
      menuPlacement="auto"
      menuPosition="fixed"
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      styles={chip ? estilosChip(selecionados.length > 0) : { menuPortal: estilosMenuPortal }}
      classNames={chip ? undefined : criarClassNames(false)}
      components={{ ...SEM_INDICADORES, Option: OpcaoComCheckbox, ValueContainer: ResumoSelecionados }}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}
