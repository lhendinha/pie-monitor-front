import ReactSelect, { components } from "react-select";
import type { ClassNamesConfig, GroupBase, OptionProps, ValueContainerProps } from "react-select";

interface Opcao {
  value: string;
  label: string;
}

/** Acima do `.modal-overlay` (100) e do `.toast-stack` (200) -- o menu é
 * portalado em `document.body`, então precisa vencer os dois em qualquer
 * ordem de montagem. */
const Z_INDEX_MENU_PORTAL = 210;
const ALTURA_MAXIMA_MENU = 240;

function estilosMenuPortal(base: Record<string, unknown>) {
  return { ...base, zIndex: Z_INDEX_MENU_PORTAL };
}

function criarClassNames(compacto: boolean): ClassNamesConfig<Opcao, boolean, GroupBase<Opcao>> {
  return {
    control: (state) =>
      ["select-control", compacto && "select-control--compacto", state.isFocused && "select-control--focado"]
        .filter(Boolean)
        .join(" "),
    menu: () => "select-menu",
    menuList: () => "select-menu-lista",
    option: (state) =>
      ["select-opcao", state.isSelected && "select-opcao--selecionada", state.isFocused && "select-opcao--focada"]
        .filter(Boolean)
        .join(" "),
    placeholder: () => "muted",
    noOptionsMessage: () => "select-vazio muted",
  };
}

const semIndicadores = { DropdownIndicator: () => null, IndicatorSeparator: () => null };

const semOpcoesDisponiveis = () => "Nenhuma opção disponível.";

/** Checkbox em cada opção -- delega o `<div>`/innerProps pro `Option`
 * padrão da lib, só troca o conteúdo interno. O `onChange` do checkbox é
 * no-op de propósito: o toggle real acontece no clique do `Option`
 * (via `innerProps`); se o checkbox também reagisse ao seu próprio
 * `onChange`, o clique dispararia dois toggles e cancelaria a si mesmo. */
function OpcaoComCheckbox(props: OptionProps<Opcao, true, GroupBase<Opcao>>) {
  return (
    <components.Option {...props}>
      <input type="checkbox" checked={props.isSelected} onChange={() => {}} tabIndex={-1} readOnly />
      {props.label}
    </components.Option>
  );
}

function rotuloResumo(selecionados: readonly Opcao[], placeholder: string) {
  if (selecionados.length === 0) return placeholder;
  if (selecionados.length <= 2) return selecionados.map((o) => o.label).join(", ");
  return `${selecionados.length} selecionados`;
}

/** Substitui as tags/chips padrão do modo múltiplo por um resumo textual
 * ("N selecionados"), igual ao `MultiSelect` custom que esse componente
 * substitui. Preserva o segundo filho (`children[1]`, o `Input` interno
 * da lib) -- removê-lo quebra foco/navegação por teclado mesmo com
 * `isSearchable={false}`. */
function ResumoSelecionados(props: ValueContainerProps<Opcao, true, GroupBase<Opcao>>) {
  const selecionados = props.getValue();
  const placeholder = String(props.selectProps.placeholder ?? "");
  const [, inputFilho] = props.children as [unknown, React.ReactNode];
  return (
    <components.ValueContainer {...props}>
      {/* mesmo grid-area que o Placeholder/SingleValue padrão da lib usam --
       * sem isso o span cai numa linha própria do grid e estica a control. */}
      <span className={selecionados.length === 0 ? "muted" : undefined} style={{ gridArea: "1 / 1 / 2 / 3" }}>
        {rotuloResumo(selecionados, placeholder)}
      </span>
      {inputFilho}
    </components.ValueContainer>
  );
}

interface SelectProps {
  id?: string;
  opcoes: Opcao[];
  valor: string;
  onMudar: (valor: string) => void;
  placeholder?: string;
  compacto?: boolean;
}

/** Substitui o `<select>` nativo -- mesmo visual do `Select`/`MultiSelect`
 * abaixo, valor único. */
export function Select({ id, opcoes, valor, onMudar, placeholder = "Selecione", compacto = false }: SelectProps) {
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
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      styles={{ menuPortal: estilosMenuPortal }}
      classNames={criarClassNames(compacto)}
      components={semIndicadores}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}

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
      maxMenuHeight={ALTURA_MAXIMA_MENU}
      menuPortalTarget={document.body}
      styles={{ menuPortal: estilosMenuPortal }}
      classNames={criarClassNames(false)}
      components={{ ...semIndicadores, Option: OpcaoComCheckbox, ValueContainer: ResumoSelecionados }}
      noOptionsMessage={semOpcoesDisponiveis}
    />
  );
}
