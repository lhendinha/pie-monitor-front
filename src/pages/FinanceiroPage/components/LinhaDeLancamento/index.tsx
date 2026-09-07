import { Flex, Table, Text } from "@chakra-ui/react";

import { CelulaComSub, Etiqueta } from "../../../../components";
import { coresDaSituacao, corDoValor, sinalDoValor } from "../../../../theme/lancamento";
import { formatarCentavos, formatarData } from "../../../../utils";
import { ROTULO_DA_SITUACAO } from "../../constants";
import type { LinhaDeLancamentoProps } from "./types";

/** Uma linha da lista de lançamentos.
 *
 * A linha inteira abre o detalhe, então precisa ser alcançável pelo teclado:
 * `tabIndex` mais Enter e espaço. Não há outro caminho -- as ações
 * (efetivar, excluir) vivem no detalhe, e não na linha.
 *
 * 🔴 **O valor mostra o PEDAÇO quando a lista está filtrada por
 * departamento**, com o total entre parênteses: `R$ 4.000 (de R$ 10.000)`. O
 * parêntese só aparece quando os dois números diferem -- num lançamento de
 * um departamento só ele seria a mesma quantia escrita duas vezes, e aí vira
 * ruído em vez de sinal.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function LinhaDeLancamento({
  lancamento: l, categoriaNome, contaNome, onAbrir,
}: LinhaDeLancamentoProps) {
  const pedaco = l.valor_no_departamento_centavos;
  const mostrarTotal = pedaco !== undefined && pedaco !== l.valor_centavos;

  return (
    <Table.Row
      tabIndex={0}
      cursor="pointer"
      _hover={{ bg: "bg.canvas" }}
      onClick={onAbrir}
      onKeyDown={(e) => {
        // ⚠️ Só quando o foco está na LINHA: sem isto, o Enter digitado
        // dentro de qualquer campo que ela venha a ter subiria e abriria o
        // detalhe. É a mesma guarda de `LinhaDoCatalogo`.
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
    >
      <CelulaComSub
        variante="destaque"
        principal={l.descricao}
        /* ⚠️ Contraparte e parcela na mesma linha de baixo: são as duas
           respostas a "de quem é isso" e "qual das quantas", e cada uma
           numa linha faria a tabela crescer para dizer pouco. */
        sub={[l.contraparte, l.parcela].filter(Boolean).join(" · ")}
      />
      <Table.Cell>
        <Text fontSize="13px" truncate>{categoriaNome}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="13px" color="fg.muted" truncate>{contaNome}</Text>
      </Table.Cell>
      <Table.Cell>
        <Text fontSize="13px" whiteSpace="nowrap">{formatarData(l.data_vencimento)}</Text>
      </Table.Cell>
      <Table.Cell>
        <Etiqueta cores={coresDaSituacao(l.situacao)}>
          {ROTULO_DA_SITUACAO[l.situacao] ?? l.situacao}
        </Etiqueta>
      </Table.Cell>
      <Table.Cell>
        <Flex direction="column" align="flex-end" gap="1px">
          <Text
            fontSize="13px"
            fontWeight="700"
            /* ⚠️ `mono` para os dígitos terem a mesma largura: é o que deixa
               duas quantias comparáveis numa coluna. */
            fontFamily="mono"
            whiteSpace="nowrap"
            color={corDoValor(l.natureza)}
          >
            {sinalDoValor(l.natureza)} R$ {formatarCentavos(pedaco ?? l.valor_centavos)}
          </Text>
          {mostrarTotal && (
            <Text fontSize="11px" color="fg.muted" whiteSpace="nowrap">
              de R$ {formatarCentavos(l.valor_centavos)}
            </Text>
          )}
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}
