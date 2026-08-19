import ReactSelect from "react-select";
import { ALTURA_MAXIMA_MENU, SEM_INDICADORES } from "../../constants/select";
import { criarClassNames, estilosMenuPortal, semOpcoesDisponiveis } from "../../utils/select";
import { OpcaoComCheckbox } from "./OpcaoComCheckbox";
import { ResumoSelecionados } from "./ResumoSelecionados";
import type { Opcao } from "./types";

interface MultiSelectProps {
  id?: string;
  opcoes: Opcao[];
  selecionados: string[];
  onMudar: (valores: string[]) => void;
  placeholder?: string;
}

/** Dropdown fechado com checkboxes -- mesmo visual do `Select` de valor
 * único, mas permitindo múltipla seleção. */
export function MultiSelect({ id, opcoes, selecionados, onMudar, placeholder = "Selecione" }: MultiSelectProps) {
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
      styles={{ menuPortal: estilosMenuPortal }}
      classNames={criarClassNames(false)}
      components={{ ...SEM_INDICADORES, Option: OpcaoComCheckbox, ValueContainer: ResumoSelecionados }}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}
