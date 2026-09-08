import { Table, Text } from "@chakra-ui/react";

import {
  CartaoDeTabela,
  CelulaComSub,
  Esqueleto,
  EstadoDeErro,
  EstadoVazio,
  Tabela,
} from "../../../../components";
import { contar, formatarCentavos } from "../../../../utils";
import { COLUNAS_A_FATURAR } from "../../constants";
import type { SecaoAFaturarProps } from "./types";

/** Os clientes com dinheiro esperando cobrança.
 *
 * 🔴 **Não é uma lista de faturas** -- é o que AINDA NÃO virou uma. Cada
 * linha é um cliente, com o que ele deve somado pelo servidor, e o clique
 * abre a emissão. Fatura sem cliente não existe, então este é o único
 * caminho para criar uma.
 *
 * 🔴 **Honorários e despesas em colunas SEPARADAS**, como no artefato, e
 * não por enfeite: a fatura os trata diferente -- o honorário é linha de
 * cobrança, a despesa vira um recebível de reembolso. Somá-las numa coluna
 * só esconderia de que é feito o total.
 *
 * ➡️ `../ListaDeFaturas/index.test.tsx`.
 */
export default function SecaoAFaturar({
  clientes, carregando, erro, onTentarDeNovo, onEmitir,
}: SecaoAFaturarProps) {
  if (carregando) return <Esqueleto linhas={4} />;
  if (erro) {
    return (
      <CartaoDeTabela>
        <EstadoDeErro
          mensagem="Não foi possível carregar o que há a faturar."
          onTentarDeNovo={onTentarDeNovo}
        />
      </CartaoDeTabela>
    );
  }

  return (
    <>
      <Text fontSize="11.5px" color="fg.subtle" mb="10px">
        {clientes.length > 0
          ? `${contar(clientes.length, "cliente", "clientes")} com honorários e despesas a faturar · clique no cliente para emitir`
          : ""}
      </Text>

      <CartaoDeTabela>
        <Tabela
          colunas={COLUNAS_A_FATURAR}
          vazio={
            clientes.length === 0 ? (
              <EstadoVazio mensagem="Nada a faturar: todo honorário e toda despesa de cliente já foram cobrados." />
            ) : undefined
          }
        >
          {clientes.map((c) => (
            <Table.Row
              key={c.cliente_id}
              tabIndex={0}
              cursor="pointer"
              _hover={{ bg: "bg.canvas" }}
              onClick={() => onEmitir(c)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onEmitir(c);
                }
              }}
            >
              <CelulaComSub
                variante="destaque"
                principal={c.cliente_nome}
                sub={contar(c.lancamentos.length, "lançamento", "lançamentos")}
              />
              <Table.Cell p="13px 14px" textAlign="right" borderBottomWidth="1px" borderBottomColor="border.subtle">
                <Text fontSize="13px" fontFamily="mono" whiteSpace="nowrap">
                  R$ {formatarCentavos(c.honorarios_centavos)}
                </Text>
              </Table.Cell>
              <Table.Cell p="13px 14px" textAlign="right" borderBottomWidth="1px" borderBottomColor="border.subtle">
                <Text fontSize="13px" fontFamily="mono" whiteSpace="nowrap">
                  R$ {formatarCentavos(c.despesas_centavos)}
                </Text>
              </Table.Cell>
              <Table.Cell p="13px 14px" textAlign="right" borderBottomWidth="1px" borderBottomColor="border.subtle">
                <Text fontSize="13px" fontWeight="700" fontFamily="mono" whiteSpace="nowrap">
                  R$ {formatarCentavos(c.total_centavos)}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Tabela>
      </CartaoDeTabela>
    </>
  );
}
