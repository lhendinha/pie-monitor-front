import { Box } from "@chakra-ui/react";
import { components } from "react-select";
import type { GroupBase, MenuProps } from "react-select";

import { MARCA_CAMADA_FLUTUANTE } from "../../constants/camadaFlutuante";
import { DIVISORIA, PAINEL } from "../../theme/painelFiltro";
import RodapeDeFiltro from "../RodapeDeFiltro";
import { OpcaoDeLinha } from "./OpcaoDeLinha";
import type { Opcao } from "./types";

/** Props que o `Select`/`MultiSelect` na variante "chip" injeta via
 * `selectProps` pra este menu -- é o caminho que o react-select oferece pra
 * passar dado do componente pai pros componentes customizados. */
export interface ExtrasDoMenu {
  rotuloTodas: string;
  nenhumSelecionado: boolean;
  onTodas: () => void;
  /** Ausentes no filtro de valor único (cliente): lá escolher já aplica, e
   * o artifact não desenha rodapé nenhum nesse painel. */
  onCancelar?: () => void;
  onAplicar?: () => void;
}

/** Painel do filtro em chip, com a moldura que o artifact tem e o menu
 * padrão do react-select não: a linha "Todas as X" no topo, a divisória, e
 * (quando a escolha é múltipla) o rodapé com Cancelar/Aplicar.
 *
 * O rodapé existe porque a seleção é MÚLTIPLA: aplicar a cada clique
 * dispararia uma busca por caixa marcada, e quem quer três situações faria
 * três requisições pra chegar onde queria.
 */
export function MenuDeFiltro(props: MenuProps<Opcao, boolean, GroupBase<Opcao>>) {
  const extras = props.selectProps as unknown as ExtrasDoMenu;
  const { onCancelar, onAplicar } = extras;

  return (
    <components.Menu {...props} innerProps={{ ...props.innerProps, ...MARCA_CAMADA_FLUTUANTE }}>
      <Box p={PAINEL.padding}>
        <OpcaoDeLinha ativa={extras.nenhumSelecionado} onClick={extras.onTodas}>
          {extras.rotuloTodas}
        </OpcaoDeLinha>
        <Box h="1px" bg="border.subtle" m={DIVISORIA.margem} />
      </Box>

      {props.children}

      {onCancelar && onAplicar && (
        <RodapeDeFiltro
          rotuloSecundario="Cancelar"
          onSecundario={onCancelar}
          onAplicar={onAplicar}
        />
      )}
    </components.Menu>
  );
}
