import { components } from "react-select";
import type { GroupBase, ValueContainerProps } from "react-select";
import { rotuloResumo } from "../../utils/select";
import type { Opcao } from "./types";

/** Extras que `MultiSelect`/`Select` passam por `selectProps` -- o caminho
 * que o react-select oferece pra levar dado até um componente substituído.
 * Mesmo padrão de `MenuDeFiltro`. */
interface ExtrasDoResumo {
  ehPilula?: boolean;
}

/** Substitui as tags/chips padrão do modo múltiplo por um resumo textual
 * ("N selecionados"), igual ao `MultiSelect` custom que esse componente
 * substitui. Preserva o segundo filho (`children[1]`, o `Input` interno
 * da lib) -- removê-lo quebra foco/navegação por teclado mesmo com
 * `isSearchable={false}`. */
export function ResumoSelecionados(props: ValueContainerProps<Opcao, true, GroupBase<Opcao>>) {
  const selecionados = props.getValue();
  const placeholder = String(props.selectProps.placeholder ?? "");
  const { ehPilula } = props.selectProps as unknown as ExtrasDoResumo;
  const [, inputFilho] = props.children as [unknown, React.ReactNode];

  /* Campo de formulário sem escolha mostra placeholder, e placeholder tem
     cor própria (`fg.subtle`, #8493a1) -- a mesma dos outros campos.

     ⚠️ Na PÍLULA de filtro não: o artifact dá a `.chip-btn` um `color`
     único (`--slate`, #5b6b7a) valha ou não filtro, e quem já define isso é
     o `control` de `estilosChip`. Aplicar `fg.subtle` aqui sobrescrevia
     aquilo e deixava só Fase e Situação (os dois `MultiSelect` da barra)
     mais claros que Clientes e Datas, que chegam na cor por outro caminho.
     Herdar é o certo: a cor da pílula é decisão do control. */
  const corDoPlaceholder =
    selecionados.length === 0 && !ehPilula ? "var(--chakra-colors-fg-subtle)" : undefined;

  return (
    <components.ValueContainer {...props}>
      {/* mesmo grid-area que o Placeholder/SingleValue padrão da lib usam --
       * sem isso o span cai numa linha própria do grid e estica a control. */}
      <span style={{ gridArea: "1 / 1 / 2 / 3", color: corDoPlaceholder }}>
        {rotuloResumo(selecionados, placeholder)}
      </span>
      {inputFilho}
    </components.ValueContainer>
  );
}
