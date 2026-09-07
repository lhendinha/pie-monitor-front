import { Box, chakra } from "@chakra-ui/react";
import { Fragment } from "react";

import { PERIODO_TODOS } from "../../../constants/periodos";
import type { OpcaoDeMenu } from "../../../types";
import { DIVISORIA, OPCAO_LINHA } from "../../../theme/painelFiltro";
import type { ListaDeOpcoesProps } from "./types";

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

/** As opções do filtro de período, em blocos separados por divisória.
 *
 * As divisórias não são enfeite: sem elas "Amanhã" e "Ontem" ficam
 * encostados numa lista corrida, e escolher o passado achando que escolheu
 * o futuro é um erro fácil de cometer e difícil de perceber -- o quadro só
 * fica vazio.
 *
 * 🔴 Os blocos VÊM DE FORA desde que o Financeiro passou a usar a mesma
 * pílula com opções próprias (Este ano, Próximos 7 dias, Mês passado, sem as
 * de dia). Antes esta lista lia `PERIODOS_FUTUROS` e `PERIODOS_PASSADOS`
 * direto, e era isso que impedia uma segunda tela de ter as suas.
 *
 * ⚠️ "Todos os períodos" e "Definir período…" continuam FIXOS, em cima e
 * embaixo: eles não são um período da lista, são o sem-limite e a porta do
 * calendário. Deixá-los configuráveis convidaria a esquecer um dos dois.
 */
export default function ListaDeOpcoes({
  selecionado, blocos, onEscolher, onAbrirPersonalizado,
}: ListaDeOpcoesProps) {
  function bloco(opcoes: readonly OpcaoDeMenu[]) {
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

      {blocos.map((opcoes, i) => (
        <Fragment key={opcoes[0]?.id ?? i}>
          <Divisoria />
          {bloco(opcoes)}
        </Fragment>
      ))}

      <Divisoria />
      {/* Sem estado "ativa": não é uma escolha, é a porta pro calendário. O
          intervalo escolhido por ele aparece no rótulo da pílula. */}
      <Opcao type="button" onClick={onAbrirPersonalizado}>
        Definir período…
      </Opcao>
    </Box>
  );
}
