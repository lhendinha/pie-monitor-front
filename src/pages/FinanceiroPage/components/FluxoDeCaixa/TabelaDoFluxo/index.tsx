import { Box, Table } from "@chakra-ui/react";

import { NATUREZA_ENTRADA, NATUREZA_SAIDA } from "../../../../../constants";
import { formatarMes } from "../../../../../utils";
import Celula from "./Celula";
import LinhaDeSaldo from "./LinhaDeSaldo";
import SecaoDoFluxo from "./SecaoDoFluxo";
import type { TabelaDoFluxoProps } from "./types";

/** A tabela mensal do fluxo: uma coluna por mês, uma linha por categoria,
 * duas seções dobráveis e o saldo no pé.
 *
 * 🔴 **O saldo não é `entradas - saídas` do mês.** Até hoje ele sai do
 * extrato real; de hoje em diante é projeção. Num mês passado, a diferença
 * entre abrir e fechar NÃO é explicada pelas colunas -- o previsto que não
 * aconteceu está nelas e não está no saldo. É por isso que as três linhas
 * existem em vez de deixar quem lê fazer a conta.
 *
 * ⚠️ **Rola na horizontal, e a primeira coluna fica.** Com 24 meses a
 * tabela é mais larga que a tela; quem rola até dezembro precisa continuar
 * vendo de que categoria é a linha.
 *
 * ⚠️ Sem saldo (`saldo_disponivel: false`) as três linhas somem: com centro
 * de custo ou departamento filtrado o servidor não manda saldo, porque o
 * saldo é da CONTA e não há como atribuir parte dele a um recorte do que
 * passou por ela. Mostrar zero seria inventar um número que não existe em
 * extrato nenhum.
 *
 * ➡️ `../index.test.tsx`.
 */
export default function TabelaDoFluxo({
  fluxo, mesCorrente, dobrados, onAlternar,
}: TabelaDoFluxoProps) {
  const { meses } = fluxo;

  const secoes = [
    {
      natureza: NATUREZA_ENTRADA,
      rotulo: "Entradas",
      totalPorMes: fluxo.entradas_por_mes,
      realizadoPorMes: fluxo.entradas_realizadas_por_mes,
    },
    {
      natureza: NATUREZA_SAIDA,
      rotulo: "Saídas",
      totalPorMes: fluxo.saidas_por_mes,
      realizadoPorMes: fluxo.saidas_realizadas_por_mes,
    },
  ];

  return (
    <Box overflowX="auto">
      {/* A largura mínima é o que força a rolagem em vez de espremer 24
          colunas de dinheiro numa tela de 1440. */}
      <Table.Root minW={`${300 + meses.length * 120}px`}>
        <Table.Header>
          <Table.Row>
            <Celula cabecalho fixa>Categoria</Celula>
            {meses.map((mes) => (
              <Celula key={mes} cabecalho aDireita realcada={mes === mesCorrente}>
                {formatarMes(mes)}
              </Celula>
            ))}
            <Celula cabecalho aDireita>Total</Celula>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {secoes.map((secao) => (
            <SecaoDoFluxo
              key={secao.natureza}
              {...secao}
              linhas={fluxo.linhas.filter((l) => l.natureza === secao.natureza)}
              meses={meses}
              mesCorrente={mesCorrente}
              dobrada={dobrados.includes(secao.natureza)}
              onAlternar={onAlternar}
            />
          ))}

          {fluxo.saldo_disponivel && (
            <>
              <LinhaDeSaldo
                rotulo="Saldo anterior"
                valores={fluxo.saldo_anterior_por_mes}
                meses={meses}
                mesCorrente={mesCorrente}
                primeira
              />
              <LinhaDeSaldo
                rotulo="Saldo do período"
                valores={fluxo.saldo_do_periodo_por_mes}
                meses={meses}
                mesCorrente={mesCorrente}
              />
              <LinhaDeSaldo
                rotulo="Saldo final"
                valores={fluxo.saldo_final_por_mes}
                meses={meses}
                mesCorrente={mesCorrente}
              />
            </>
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
