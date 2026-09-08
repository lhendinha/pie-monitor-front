import { Table, Text } from "@chakra-ui/react";

import { formatarCentavos } from "../../../../../utils";
import Celula from "./Celula";
import type { LinhaDeSaldoProps } from "./types";

/** Uma das três linhas de saldo, no pé da tabela.
 *
 * 🔴 Elas existem porque `entradas - saídas` NÃO explica a diferença entre
 * abrir e fechar um mês passado: o previsto que não aconteceu está nas
 * colunas e não está no saldo. Deixar quem lê fazer a conta produziria uma
 * diferença que parece erro do sistema.
 *
 * ⚠️ **As três têm o MESMO peso**, rótulo e valor em 800. Antes só o "Saldo
 * final" tinha o valor em negrito, e as outras duas ficavam com rótulo forte
 * e número fraco -- três linhas da mesma natureza com dois pesos diferentes.
 * Quem separa o bloco do resto é a divisória de cima, não o negrito.
 */
export default function LinhaDeSaldo({
  rotulo, valores, meses, mesCorrente, primeira,
}: LinhaDeSaldoProps) {
  return (
    <Table.Row>
      <Celula fixa forte separada={primeira}>{rotulo}</Celula>
      {meses.map((mes) => {
        const centavos = valores[mes] ?? 0;
        return (
          <Celula
            key={mes}
            aDireita
            forte
            separada={primeira}
            realcada={mes === mesCorrente}
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
      <Celula aDireita forte separada={primeira}>
        <Text as="span" color="fg.subtle">—</Text>
      </Celula>
    </Table.Row>
  );
}
