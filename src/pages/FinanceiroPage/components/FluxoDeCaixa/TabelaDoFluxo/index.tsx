import { Box, Flex, Table, Text } from "@chakra-ui/react";

import { NATUREZA_ENTRADA, NATUREZA_SAIDA } from "../../../../../constants";
import { mesDaColuna } from "../../../../../utils";
import { ehPrevisao, legendaDoFluxo, naturezaDaColuna } from "../legendaDoFluxo";
import Celula from "./Celula";
import FaixaDaSecao from "./FaixaDaSecao";
import LinhaDeSaldo from "./LinhaDeSaldo";
import SecaoDoFluxo from "./SecaoDoFluxo";
import type { TabelaDoFluxoProps } from "./types";

/** A tabela mensal do fluxo, na ordem do artefato: saldo anterior, entradas
 * e o total delas, saídas e o total delas, e o bloco do saldo.
 *
 * 🔴 **A distinção entre o que ACONTECEU e o que é expectativa é a coisa
 * mais importante daqui**, e aparece três vezes: na legenda do topo, no
 * subtítulo de cada coluna e no fundo âmbar das colunas de previsão. Um
 * relatório em que não se sabe o que é fato e o que é palpite não serve
 * para decidir nada.
 *
 * ⚠️ **Rola na horizontal, e a primeira coluna fica.** Com 24 meses a tabela
 * é mais larga que a tela; quem rola até dezembro precisa continuar vendo de
 * que linha é o número.
 *
 * ⚠️ Sem saldo (`saldo_disponivel: false`) o bloco inteiro some, faixa
 * incluída: com centro de custo ou departamento filtrado o servidor não
 * manda saldo, porque o saldo é da CONTA e não há como atribuir parte dele a
 * um recorte do que passou por ela. Mostrar zero seria inventar um número
 * que não existe em extrato nenhum.
 *
 * ➡️ `../index.test.tsx`.
 */
export default function TabelaDoFluxo({
  fluxo, mesCorrente, rotuloDoPeriodo, dobrados, onAlternar,
}: TabelaDoFluxoProps) {
  const { meses } = fluxo;
  const colunas = meses.length + 2;

  return (
    <Box overflowX="auto">
      {/* A legenda atravessa a tabela e não rola com ela: é o resumo do que
          se está olhando, e rolar para a direita não muda esse resumo. */}
      <Text
        p="12px 14px"
        fontSize="10.5px"
        fontWeight="800"
        letterSpacing="0.6px"
        color="fg.subtle"
        textAlign="center"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
      >
        {legendaDoFluxo(meses, mesCorrente, rotuloDoPeriodo)}
      </Text>

      <Table.Root minW={`${300 + meses.length * 120}px`}>
        <Table.Header>
          <Table.Row>
            <Celula cabecalho fixa>DESCRIÇÃO</Celula>
            {meses.map((mes) => (
              <Celula
                key={mes}
                cabecalho
                aDireita
                previsao={ehPrevisao(mes, mesCorrente)}
              >
                {/* Duas linhas, como no artefato: o mês e o que ele é. */}
                <Flex direction="column" align="flex-end" gap="2px">
                  <Text as="span" fontSize="11px" fontWeight="800">
                    {mesDaColuna(mes)}
                  </Text>
                  <Text
                    as="span"
                    fontSize="9px"
                    fontWeight="700"
                    color="fg.subtle"
                    letterSpacing="0.4px"
                  >
                    {naturezaDaColuna(mes, mesCorrente)}
                  </Text>
                </Flex>
              </Celula>
            ))}
            <Celula cabecalho aDireita>TOTAL</Celula>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {/* 🔴 De onde se partiu, ANTES do que entrou e do que saiu. */}
          {fluxo.saldo_disponivel && (
            <LinhaDeSaldo
              rotulo="Saldo anterior"
              valores={fluxo.saldo_anterior_por_mes}
              meses={meses}
              mesCorrente={mesCorrente}
              forte
            />
          )}

          <SecaoDoFluxo
            natureza={NATUREZA_ENTRADA}
            rotulo="ENTRADAS"
            rotuloDoTotal="Total de entradas"
            linhas={fluxo.linhas.filter((l) => l.natureza === NATUREZA_ENTRADA)}
            meses={meses}
            totalPorMes={fluxo.entradas_por_mes}
            mesCorrente={mesCorrente}
            dobrada={dobrados.includes(NATUREZA_ENTRADA)}
            onAlternar={onAlternar}
          />
          <SecaoDoFluxo
            natureza={NATUREZA_SAIDA}
            rotulo="SAÍDAS"
            rotuloDoTotal="Total de saídas"
            linhas={fluxo.linhas.filter((l) => l.natureza === NATUREZA_SAIDA)}
            meses={meses}
            totalPorMes={fluxo.saidas_por_mes}
            mesCorrente={mesCorrente}
            dobrada={dobrados.includes(NATUREZA_SAIDA)}
            onAlternar={onAlternar}
          />

          {fluxo.saldo_disponivel && (
            <>
              <FaixaDaSecao
                rotulo="SALDO"
                quantasColunas={colunas}
                fundo="bg.brand.subtle"
                cor="brand.darker"
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
                forte
              />
            </>
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
