import { Flex, Text } from "@chakra-ui/react";

import {
  BotaoQuadrado,
  IconeLapis,
  IconeOlho,
  IconeOlhoCortado,
} from "../../../../components";
import type { LinhaDoCatalogoProps } from "./types";

/** Uma linha das listas de Configurações -- conta, categoria ou centro.
 *
 * ⚠️ Uma só para as três porque a forma é a mesma (marcador, nome, detalhe,
 * algo à direita, ações) e só o conteúdo muda. Três componentes quase iguais
 * significariam corrigir o mesmo espaçamento em três lugares.
 *
 * ⚠️ Nome e detalhe na MESMA linha, como no artefato: o detalhe é aposto do
 * nome ("Impostos · agrupador de 3 categorias"), não uma segunda informação.
 * Em duas linhas, a lista dobra de altura e a leitura vertical se perde.
 *
 * ⚠️ NÃO usa `LinhaDeLista`, e a diferença é medida: aquele componente é o
 * `.subgrupo-row` do artefato (4px laterais, sem divisória própria) e o
 * Financeiro usa o `.linha-lista` (13px 14px, com divisória). Reaproveitá-lo
 * deixava as linhas 10px mais estreitas de cada lado e sem risco entre elas.
 * O que veio de lá, porque vale para as duas, é o `& svg` de 16px: oito dos
 * ícones do projeto não trazem tamanho próprio e viram 32px sem ele.
 *
 * ⚠️ **"Renomear", e não "Editar" -- e é divergência do artefato, assumida.**
 * O artefato escreve "Editar" na conta e na categoria; a API aceita só o
 * NOME no `PATCH` do catálogo, de propósito (trocar a natureza de uma
 * categoria inverteria o sinal do que já foi lançado, e trocar o tipo de uma
 * conta mudaria quais campos são obrigatórios num item que já existe).
 * "Editar" prometeria um formulário que abre com um campo só.
 *
 * ⚠️ O item inativo continua na lista, apagado. Sumir com ele esconderia que
 * ele existe -- e o nome dele continua ocupado, então quem tentasse recriá-lo
 * levaria um 409 sem entender.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function LinhaDoCatalogo({
  nome,
  detalhe,
  marcador,
  direita,
  filha = false,
  ativo,
  onEditar,
  onAlternarAtivo,
  ocupada = false,
  rotuloDeEditar = "Renomear",
  nomeParaRotulo,
}: LinhaDoCatalogoProps) {
  /** O texto que os `aria-label` das ações usam. Vem separado porque `nome`
   * pode ser um nó (o `NomeEditavel` do centro de custo). */
  const rotulo = nomeParaRotulo ?? (typeof nome === "string" ? nome : "");
  return (
    <Flex
      align="center"
      gap="10px"
      p="13px 14px"
      pl={filha ? "38px" : "14px"}
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      _last={{ borderBottomWidth: "0" }}
      opacity={ativo ? 1 : 0.55}
      css={{ "& svg": { width: "16px", height: "16px", flex: "0 0 auto" } }}
    >
      {marcador && (
        <Flex color="fg.subtle" flexShrink="0">
          {marcador}
        </Flex>
      )}
      <Flex flex="1" minW="0" align="center" gap="8px">
        <Text
          fontSize="14px"
          fontWeight="700"
          color="fg"
          flexShrink="0"
          truncate
        >
          {nome}
        </Text>
        {detalhe && (
          /* ⚠️ `as="span"`, e NÃO o `<p>` padrão do `Text`: o `detalhe` é um
             `ReactNode`, e a lista de contas manda um `Flex` (que é `div`)
             para pôr a etiqueta "Padrão" ao lado. `<div>` dentro de `<p>` é
             aninhamento inválido -- o React avisa no console e o navegador
             FECHA o parágrafo sozinho, quebrando o layout da linha. */
          <Text as="span" fontSize="12px" fontWeight="400" color="fg.muted" truncate>
            {detalhe}
          </Text>
        )}
      </Flex>
      {direita}
      {(onEditar || onAlternarAtivo) && (
        <Flex gap="6px" flexShrink="0">
          {onEditar && (
            <BotaoQuadrado
              type="button"
              title={rotuloDeEditar}
              aria-label={`${rotuloDeEditar} ${rotulo}`}
              disabled={ocupada}
              onClick={onEditar}
            >
              <IconeLapis />
            </BotaoQuadrado>
          )}
          {onAlternarAtivo && (
            <BotaoQuadrado
              type="button"
              tom={ativo ? "perigo" : "neutro"}
              title={ativo ? "Desativar" : "Reativar"}
              aria-label={`${ativo ? "Desativar" : "Reativar"} ${rotulo}`}
              disabled={ocupada}
              onClick={onAlternarAtivo}
            >
              {ativo ? <IconeOlhoCortado /> : <IconeOlho />}
            </BotaoQuadrado>
          )}
        </Flex>
      )}
    </Flex>
  );
}
