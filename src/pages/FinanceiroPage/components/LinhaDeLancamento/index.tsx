import { Flex, Table, Text } from "@chakra-ui/react";

import { CelulaComSub, Etiqueta } from "../../../../components";
import { coresDaSituacao, corDoValor, sinalDoValor } from "../../../../theme/lancamento";
import { formatarCentavos, formatarData } from "../../../../utils";
import { LARGURA_MAXIMA_DA_COLUNA_DE_TEXTO, LARGURA_MAXIMA_DA_DESCRICAO, ROTULO_DA_SITUACAO } from "../../constants";
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
        maxLargura={LARGURA_MAXIMA_DA_DESCRICAO}
        principal={l.descricao}
        /* 🔴 A parcela NÃO entra aqui: o servidor já a escreve no fim da
           DESCRIÇÃO ("Honorários · assessoria mensal · 1/6"), e repeti-la na
           linha de baixo punha "1/6" duas vezes na mesma linha da tabela --
           visto na tela com a série semeada. O `parcela` do item existe para
           quem quer o número sozinho, não para desenhar aqui. */
        sub={l.contraparte || l.cliente_nome}
      />
      <Table.Cell
        p="13px 14px"
        maxW={LARGURA_MAXIMA_DA_COLUNA_DE_TEXTO}
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
      >
        <Text fontSize="13px" truncate>{categoriaNome}</Text>
      </Table.Cell>
      <Table.Cell
        p="13px 14px"
        maxW={LARGURA_MAXIMA_DA_COLUNA_DE_TEXTO}
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
      >
        {/* 🔴 A TRANSFERÊNCIA não tem `conta_id` -- ela tem origem e destino.
            Sem esta metade a coluna aparecia vazia justamente na linha em que
            a conta é a única coisa que importa. */}
        <Text fontSize="13px" color="fg.muted" truncate>{contaNome}</Text>
      </Table.Cell>
      <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Text fontSize="13px" whiteSpace="nowrap">{formatarData(l.data_vencimento)}</Text>
      </Table.Cell>
      <Table.Cell p="13px 14px" borderBottomWidth="1px" borderBottomColor="border.subtle">
        <Etiqueta cores={coresDaSituacao(l.situacao)}>
          {ROTULO_DA_SITUACAO[l.situacao] ?? l.situacao}
        </Etiqueta>
      </Table.Cell>
      {/* 🔴 `textAlign` na CÉLULA, e não só o `Flex` que empurra o conteúdo:
          é `td.direita` no artefato, e é o que faz o cabeçalho da coluna e o
          número dela ficarem no mesmo eixo. O cabeçalho é
          `{ rotulo: "Valor", aDireita: true }` em `COLUNAS_DE_LANCAMENTOS`. */}
      <Table.Cell
        p="13px 14px"
        textAlign="right"
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
      >
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
