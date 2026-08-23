import { Box, chakra } from "@chakra-ui/react";

import {
  PERIODOS_FUTUROS,
  PERIODOS_PASSADOS,
  PERIODO_TODOS,
  type OpcaoDePeriodo,
} from "../../../constants/periodos";
import { DIVISORIA, OPCAO_LINHA } from "../../../theme/painelFiltro";

/** `.period-opt` do artifact. `chakra.button` e não `<button>` solto: com
 * `preflight: false` o botão do navegador vem cinza, com borda e fonte
 * própria. */
const Opcao = chakra("button", {
  base: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: OPCAO_LINHA.padding,
    borderRadius: OPCAO_LINHA.raio,
    fontSize: OPCAO_LINHA.fonte,
    fontWeight: OPCAO_LINHA.peso,
    color: "fg",
    bg: "transparent",
    borderWidth: "0",
    cursor: "pointer",
    _hover: { bg: "bg.canvas" },
  },
  variants: {
    ativa: {
      true: {
        bg: "bg.brand.subtle",
        color: "brand.darker",
        fontWeight: OPCAO_LINHA.pesoAtiva,
        _hover: { bg: "bg.brand.subtle" },
      },
    },
  },
});

const Divisoria = chakra(Box, {
  base: {
    height: "1px",
    bg: "border.subtle",
    margin: DIVISORIA.margem,
  },
});

interface ListaDeOpcoesProps {
  selecionado: string;
  onEscolher: (id: string) => void;
  onAbrirPersonalizado: () => void;
}

/** As opções fixas do filtro de período, nos três blocos do artifact.
 *
 * As divisórias não são enfeite: sem elas "Amanhã" e "Ontem" ficam
 * encostados numa lista corrida, e escolher o passado achando que escolheu
 * o futuro é um erro fácil de cometer e difícil de perceber -- o quadro só
 * fica vazio.
 */
export default function ListaDeOpcoes({ selecionado, onEscolher, onAbrirPersonalizado }: ListaDeOpcoesProps) {
  function bloco(opcoes: readonly OpcaoDePeriodo[]) {
    return opcoes.map((o) => (
      <Opcao key={o.id} type="button" ativa={o.id === selecionado} onClick={() => onEscolher(o.id)}>
        {o.rotulo}
      </Opcao>
    ));
  }

  return (
    <Box p="6px">
      <Opcao
        type="button"
        ativa={selecionado === PERIODO_TODOS}
        onClick={() => onEscolher(PERIODO_TODOS)}
      >
        Todos os períodos
      </Opcao>

      <Divisoria />
      {bloco(PERIODOS_FUTUROS)}

      <Divisoria />
      {bloco(PERIODOS_PASSADOS)}

      <Divisoria />
      {/* Sem estado "ativa": não é uma escolha, é a porta pro calendário. O
          intervalo escolhido por ele aparece no rótulo da pílula. */}
      <Opcao type="button" onClick={onAbrirPersonalizado}>
        Definir período…
      </Opcao>
    </Box>
  );
}
