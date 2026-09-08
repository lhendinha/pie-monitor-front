import { Table, Text } from "@chakra-ui/react";

import { formatarCentavos } from "../../../../../utils";
import { ehPrevisao } from "../legendaDoFluxo";
import Celula from "./Celula";
import type { LinhaDeSaldoProps } from "./types";

/** Uma linha de saldo: "Saldo anterior" no topo da tabela, "Saldo do
 * período" e "Saldo final" no pé.
 *
 * 🔴 **O "Saldo anterior" é a PRIMEIRA linha**, antes das entradas, como no
 * artefato -- e a ordem é a da leitura: de quanto se partiu, o que entrou, o
 * que saiu, onde se chegou. Eu tinha empilhado as três no pé, e aí a tabela
 * começava sem dizer de onde vinha.
 *
 * 🔴 Elas existem porque `entradas - saídas` NÃO explica a diferença entre
 * abrir e fechar um mês passado: o previsto que não aconteceu está nas
 * colunas e não está no saldo. Deixar quem lê fazer a conta produziria uma
 * diferença que parece erro do sistema.
 */
export default function LinhaDeSaldo({
  rotulo, valores, meses, mesCorrente, forte,
}: LinhaDeSaldoProps) {
  return (
    <Table.Row>
      <Celula fixa forte={forte}>{rotulo}</Celula>
      {meses.map((mes) => {
        const centavos = valores[mes] ?? 0;
        return (
          <Celula
            key={mes}
            aDireita
            forte={forte}
            previsao={ehPrevisao(mes, mesCorrente)}
          >
            <Text
              as="span"
              fontFamily="mono"
              /* ⚠️ Vermelho onde o sinal é a informação: no "saldo do
                 período", um mês negativo é ter gasto mais do que entrou; no
                 final, é conta no vermelho. */
              color={centavos < 0 ? "status.bad.text" : undefined}
            >
              R$ {formatarCentavos(centavos)}
            </Text>
          </Celula>
        );
      })}
      {/* ⚠️ Travessão na coluna de total: somar saldos de meses seguidos não
          significa nada -- o de dezembro já contém o de janeiro. Zero ali se
          leria como "fechou zerado". */}
      <Celula aDireita forte={forte}>
        <Text as="span" color="fg.subtle">—</Text>
      </Celula>
    </Table.Row>
  );
}
