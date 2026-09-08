import { Flex, SimpleGrid, Table, Text } from "@chakra-ui/react";

import {
  CampoDeLeitura,
  Cartao,
  CartaoDeTabela,
  EstadoVazio,
  Tabela,
} from "../../../../components";
import { NATUREZA_SAIDA } from "../../../../constants";
import { contar, formatarCentavos, formatarData } from "../../../../utils";
import { COLUNAS_DO_DOCUMENTO } from "../../../FinanceiroPage/constants";
import type { DocumentoDaFaturaProps } from "./types";

/** O documento em si: o que a fatura cobra, o total, e os dados dela.
 *
 * 🔴 **O total vem do SERVIDOR, e não da soma das linhas.** Ele foi
 * congelado na emissão -- é o número que foi impresso e mandado ao cliente.
 * Recalculá-lo aqui faria o documento mudar sozinho no dia em que alguém
 * editasse um lançamento, e é justamente o que a API impede com 409.
 *
 * ⚠️ **A despesa reembolsada não é linha daqui.** A emissão cria um
 * recebível de reembolso no valor dela, e é ESSE que aparece na tabela; a
 * despesa em si é dinheiro que saiu para o cartório. Somar as duas faria as
 * linhas não fecharem com o total.
 *
 * ⚠️ **Dois cartões irmãos, nunca um dentro do outro.** `CartaoDeTabela` já
 * É cartão (borda, raio e sombra), e envolvê-lo num `Cartao` desenhava
 * moldura dentro de moldura, com os campos de leitura colados na borda de
 * baixo da tabela. Visto na tela.
 *
 * 🔴 **Grade própria, e não `LinhaDeCampos`** -- duas medições, as duas em
 * Chrome:
 *
 * 1. `LinhaDeCampos` tem `rowGap: 0` de propósito, porque quem espaça na
 *    vertical lá é a margem do `Campo`. O `CampoDeLeitura` não tem margem
 *    nenhuma, e nenhuma tela tinha juntado os dois antes -- os pares saíam
 *    colados.
 * 2. As colunas dele vêm do breakpoint `sm` do Chakra, que é `@media
 *    screen`: NO PAPEL a grade desabava para uma coluna só (medido:
 *    `544px 544px` na tela, `1402px` na impressão). Aqui a media query é
 *    CRUA, sem `screen`, e a fatura impressa mantém o par lado a lado.
 *
 * ⚠️ `auto-fit` + `minmax` também não tem media query e foi a primeira
 * tentativa -- mas num cartão de 1100px ele cabe QUATRO colunas, e os
 * quatro campos saíam numa fila só. Medido, não suposto.
 *
 * ➡️ `../../index.test.tsx`.
 */
export default function DocumentoDaFatura({
  fatura, nomeDoCliente, contaDoRecebimento,
}: DocumentoDaFaturaProps) {
  const somaDasLinhas = fatura.lancamentos.reduce((s, l) => s + l.valor_centavos, 0);
  /* 🔴 Divergência entre o total congelado e a soma das linhas é sinal de
     que um lançamento sumiu da base, não de arredondamento. Dizer isso é
     melhor que mostrar dois números e deixar quem lê descobrir sozinho. */
  const divergiu = somaDasLinhas !== fatura.valor_total_centavos;

  return (
    <>
      <CartaoDeTabela>
        <Tabela
          colunas={COLUNAS_DO_DOCUMENTO}
          vazio={
            fatura.lancamentos.length === 0 ? (
              <EstadoVazio mensagem="Os lançamentos desta fatura não foram encontrados." />
            ) : undefined
          }
        >
          {fatura.lancamentos.map((l) => (
            <Table.Row key={l.lancamento_id}>
              <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                <Text fontSize="13px" fontWeight="700">{l.descricao}</Text>
                {/* ⚠️ A linha de reembolso se anuncia: ela não é honorário,
                    é a devolução de uma despesa que o escritório adiantou. */}
                {l.natureza === NATUREZA_SAIDA && (
                  <Text fontSize="12px" color="fg.subtle">Reembolso de despesa</Text>
                )}
              </Table.Cell>
              <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                <Text fontSize="12.5px" fontFamily="mono" whiteSpace="nowrap">
                  {formatarData(l.data_vencimento)}
                </Text>
              </Table.Cell>
              <Table.Cell p="13px 14px" textAlign="right" borderBottomWidth="1px" borderBottomColor="border.subtle">
                <Text fontSize="13px" fontFamily="mono" whiteSpace="nowrap">
                  R$ {formatarCentavos(l.valor_centavos)}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Tabela>

        <Flex justify="space-between" align="center" p="12px 14px"
              borderTopWidth="1px" borderTopColor="border">
          <Text fontSize="13px" fontWeight="700">
            Total da fatura
            <Text as="span" color="fg.subtle" fontWeight="400" ml="8px">
              {contar(fatura.lancamentos.length, "lançamento", "lançamentos")}
            </Text>
          </Text>
          <Text fontSize="14px" fontWeight="800" fontFamily="mono">
            R$ {formatarCentavos(fatura.valor_total_centavos)}
          </Text>
        </Flex>
      </CartaoDeTabela>

      {divergiu && (
        <Text fontSize="12px" color="status.bad">
          As linhas somam R$ {formatarCentavos(somaDasLinhas)}, e o documento foi
          emitido por R$ {formatarCentavos(fatura.valor_total_centavos)}. Vale o
          valor emitido — algum lançamento desta fatura não foi encontrado.
        </Text>
      )}

      <Cartao titulo="Dados da fatura">
        <SimpleGrid
          /* Uma coluna por padrão, duas a partir de 480px -- e a media query
             é CRUA, sem `screen`, para valer no papel também. */
          templateColumns="1fr"
          css={{ "@media (min-width: 480px)": { gridTemplateColumns: "1fr 1fr" } }}
          columnGap="14px"
          rowGap="16px"
        >
          <CampoDeLeitura rotulo="Cliente">
            <Valor>{nomeDoCliente}</Valor>
          </CampoDeLeitura>
          <CampoDeLeitura rotulo="Vencimento">
            <Valor>{formatarData(fatura.data_vencimento)}</Valor>
          </CampoDeLeitura>
          <CampoDeLeitura rotulo="Emitida em">
            <Valor>{formatarData(fatura.criado_em.slice(0, 10))}</Valor>
          </CampoDeLeitura>
          <CampoDeLeitura rotulo="Emitida por">
            <Valor>{fatura.criado_por}</Valor>
          </CampoDeLeitura>
          {/* ⚠️ Só na paga: numa fatura em aberto o par ficaria com travessão
              em duas linhas, dizendo de novo o que a etiqueta do título já
              diz. */}
          {fatura.pago_em && (
            <>
              <CampoDeLeitura rotulo="Paga em">
                <Valor>{formatarData(fatura.pago_em)}</Valor>
              </CampoDeLeitura>
              <CampoDeLeitura rotulo="Conta do recebimento">
                <Valor>{contaDoRecebimento || "Mais de uma conta"}</Valor>
              </CampoDeLeitura>
            </>
          )}
        </SimpleGrid>
      </Cartao>
    </>
  );
}

/** O valor de um campo de leitura, no tamanho que `DetalheHistorico` já usa.
 * Texto solto dentro do `CampoDeLeitura` herda o 14px do corpo e fica maior
 * que o rótulo pede. */
function Valor({ children }: { children: React.ReactNode }) {
  return <Text fontSize="13.5px">{children}</Text>;
}
