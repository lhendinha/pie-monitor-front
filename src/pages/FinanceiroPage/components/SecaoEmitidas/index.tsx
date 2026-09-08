import { Table, Text } from "@chakra-ui/react";

import {
  CartaoDeTabela,
  Esqueleto,
  EstadoDeErro,
  EstadoVazio,
  Etiqueta,
  Pagination,
  Tabela,
} from "../../../../components";
import { coresDaFatura } from "../../../../theme/fatura";
import {
  ROTULO_DA_FATURA,
  contar,
  formatarCentavos,
  formatarData,
  situacaoDaFaturaNaTela,
} from "../../../../utils";
import { COLUNAS_DE_FATURAS } from "../../constants";
import type { SecaoEmitidasProps } from "./types";

/** As faturas já emitidas.
 *
 * 🔴 **"Atrasada" é derivada AQUI**, e não vem do servidor: a fatura tem
 * três situações gravadas, e atraso é a data lida contra hoje. Mantê-lo em
 * dia no banco exigiria reescrever toda fatura aberta todas as noites -- a
 * mesma decisão que o lançamento já tomou. Quem deriva é
 * `situacaoDaFaturaNaTela`, uma função só.
 *
 * ⚠️ **A coluna "Pagamento" mostra travessão na não-paga.** Célula vazia
 * lê-se como "não carregou"; o travessão diz "não aconteceu".
 *
 * ⚠️ **Paginada no servidor**, ao contrário de "A faturar": a fatura paga e
 * a cancelada não somem da lista, então ela só cresce. A contagem é a do
 * TOTAL, e não a das linhas da página.
 *
 * ➡️ `../ListaDeFaturas/index.test.tsx`.
 */
export default function SecaoEmitidas({
  faturas, carregando, erro, onTentarDeNovo, paginacao, nomeDoCliente, onAbrir,
}: SecaoEmitidasProps) {
  if (carregando) return <Esqueleto linhas={4} />;
  if (erro) {
    return (
      <CartaoDeTabela>
        <EstadoDeErro
          mensagem="Não foi possível carregar as faturas."
          onTentarDeNovo={onTentarDeNovo}
        />
      </CartaoDeTabela>
    );
  }

  return (
    <>
      <Text fontSize="11.5px" color="fg.subtle" mb="10px">
        {paginacao.total > 0
          ? `Mostrando ${faturas.length} de ${contar(paginacao.total, "fatura emitida", "faturas emitidas")}`
          : ""}
      </Text>

      <CartaoDeTabela>
        <Tabela
          colunas={COLUNAS_DE_FATURAS}
          vazio={
            faturas.length === 0 ? (
              <EstadoVazio mensagem="Nenhuma fatura emitida neste período." />
            ) : undefined
          }
        >
          {faturas.map((f) => {
            const situacao = situacaoDaFaturaNaTela(f);
            return (
              <Table.Row
                key={f.fatura_id}
                tabIndex={0}
                cursor="pointer"
                _hover={{ bg: "bg.canvas" }}
                onClick={() => onAbrir(f.fatura_id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAbrir(f.fatura_id);
                  }
                }}
              >
                <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                  <Text fontSize="12.5px" fontFamily="mono" whiteSpace="nowrap">{f.numero}</Text>
                </Table.Cell>
                <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                  <Text fontSize="13px" fontWeight="700" truncate>{nomeDoCliente(f.cliente_id)}</Text>
                </Table.Cell>
                <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                  <Text fontSize="13px" whiteSpace="nowrap">{formatarData(f.data_vencimento)}</Text>
                </Table.Cell>
                <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                  {/* ⚠️ Travessão, não vazio: vazio lê-se como "não carregou". */}
                  <Text fontSize="13px" whiteSpace="nowrap" color={f.pago_em ? undefined : "fg.subtle"}>
                    {f.pago_em ? formatarData(f.pago_em) : "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell p="13px 14px" textAlign="right" borderBottomWidth="1px" borderBottomColor="border.subtle">
                  <Text fontSize="13px" fontWeight="700" fontFamily="mono" whiteSpace="nowrap">
                    R$ {formatarCentavos(f.valor_total_centavos)}
                  </Text>
                </Table.Cell>
                <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
                  <Etiqueta cores={coresDaFatura(situacao)}>
                    {ROTULO_DA_FATURA[situacao] ?? situacao}
                  </Etiqueta>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Tabela>
        <Pagination {...paginacao} />
      </CartaoDeTabela>
    </>
  );
}
