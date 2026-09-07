import { SimpleGrid, Text, chakra } from "@chakra-ui/react";

import { SITUACAO_ABERTO, SITUACAO_ATRASADO, TIPO_ENTRADA, TIPO_SAIDA } from "../../../../constants";
import { contar, formatarCentavos } from "../../../../utils";
import type { CartoesDeTotaisProps } from "./types";

/** ⚠️ `chakra("button")` e não `<button>`: com `preflight: false` o botão do
 * navegador vem cinza, com borda e fonte próprias. */
const Cartao = chakra("button", {
  base: {
    textAlign: "left",
    padding: "13px 15px",
    borderWidth: "1px",
    borderColor: "border",
    borderRadius: "10px",
    bg: "bg.surface",
    cursor: "pointer",
    _hover: { bg: "bg.canvas" },
  },
});

/** Os três números do topo da lista: a receber, a pagar e atrasado.
 *
 * 🔴 **Vêm da resposta, e são do PERÍODO inteiro** -- não da página. Somar as
 * linhas visíveis faria mudar de página mudar o número do card, e ninguém
 * saberia qual dos dois é o do escritório.
 *
 * ⚠️ **Cada card é um botão**: ele diz um recorte e leva a ele. Um número que
 * responde "R$ 40.000 atrasados" e não abre a lista daquilo obriga a pessoa
 * a refazer o filtro à mão para ver de quem é.
 *
 * ⚠️ O período vai no subtítulo porque o número sozinho não diz de quando
 * fala -- e a mesma tela troca de período o tempo todo.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function CartoesDeTotais({ totais, periodo, onFiltrar }: CartoesDeTotaisProps) {
  const cartoes = [
    {
      rotulo: "A receber",
      centavos: totais.a_receber_centavos,
      quantos: totais.a_receber_quantidade,
      cor: "status.good.text",
      situacao: SITUACAO_ABERTO,
      tipo: TIPO_ENTRADA,
    },
    {
      rotulo: "A pagar",
      centavos: totais.a_pagar_centavos,
      quantos: totais.a_pagar_quantidade,
      cor: "status.bad.text",
      situacao: SITUACAO_ABERTO,
      tipo: TIPO_SAIDA,
    },
    {
      /* 🔴 Atrasado NÃO filtra por tipo: são os dois lados juntos, e é essa
         a pergunta -- "o que já devia ter acontecido e não aconteceu". */
      rotulo: "Atrasado",
      centavos: totais.atrasado_centavos,
      quantos: totais.atrasado_quantidade,
      cor: "status.bad.text",
      situacao: SITUACAO_ATRASADO,
      tipo: "",
    },
  ];

  return (
    <SimpleGrid columns={{ base: 1, sm: 3 }} gap="10px" mb="14px">
      {cartoes.map((c) => (
        <Cartao key={c.rotulo} type="button" onClick={() => onFiltrar(c.situacao, c.tipo)}>
          <Text
            fontSize="21px"
            fontWeight="800"
            lineHeight="1.15"
            letterSpacing="-0.02em"
            color={c.cor}
            /* Os três ficam lado a lado: sem tabular, "11" e "44" saem com
               larguras diferentes e a fileira dança. */
            className="num"
          >
            R$ {formatarCentavos(c.centavos)}
          </Text>
          <Text fontSize="12px" fontWeight="500" color="fg.muted" mt="2px">
            {c.rotulo} · {periodo}
          </Text>
          <Text fontSize="11.5px" color="fg.subtle" mt="1px">
            {contar(c.quantos, "lançamento", "lançamentos")}
          </Text>
        </Cartao>
      ))}
    </SimpleGrid>
  );
}
