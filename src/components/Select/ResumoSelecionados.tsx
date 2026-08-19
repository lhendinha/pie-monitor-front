import { components } from "react-select";
import type { GroupBase, ValueContainerProps } from "react-select";
import { rotuloResumo } from "../../utils/select";
import type { Opcao } from "./types";

/** Substitui as tags/chips padrão do modo múltiplo por um resumo textual
 * ("N selecionados"), igual ao `MultiSelect` custom que esse componente
 * substitui. Preserva o segundo filho (`children[1]`, o `Input` interno
 * da lib) -- removê-lo quebra foco/navegação por teclado mesmo com
 * `isSearchable={false}`. */
export function ResumoSelecionados(props: ValueContainerProps<Opcao, true, GroupBase<Opcao>>) {
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
