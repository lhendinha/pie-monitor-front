import { Flex, Table, Text } from "@chakra-ui/react";

import { BotaoNu, IconeChevron } from "../../../../../components";
import type { FaixaDaSecaoProps } from "./types";

/** A faixa que nomeia uma seção -- ENTRADAS, SAÍDAS, SALDO.
 *
 * 🔴 **É uma faixa, e não uma linha de números.** No artefato ela atravessa
 * a tabela inteira com o tom da seção (verde, vermelho, azul) e diz só o
 * nome; quem carrega os números é o "Total de entradas" logo abaixo das
 * categorias. Eu tinha juntado as duas coisas numa linha só -- os totais
 * ficavam ANTES das categorias que os compõem, que é a ordem inversa da que
 * se lê.
 *
 * ⚠️ O tom é o do semáforo do projeto, e o texto usa a versão ESCURA dele:
 * a cor cheia sobre o tint não passa em 4,5:1, que é a régua de texto
 * pequeno (ver `theme/contraste.test.ts`).
 *
 * ⚠️ A faixa do SALDO não dobra: ela tem duas linhas e nenhuma categoria --
 * uma seta que esconde o resultado da tabela não serve a ninguém.
 */
export default function FaixaDaSecao({
  rotulo, natureza, quantasColunas, fundo, cor, dobrada, onAlternar,
}: FaixaDaSecaoProps) {
  const nome = (
    <Flex align="center" gap="8px">
      {onAlternar && natureza && (
        <Flex
          as="span"
          color={cor}
          transition="transform .15s"
          transform={dobrada ? "rotate(-90deg)" : undefined}
        >
          <IconeChevron tamanho={13} />
        </Flex>
      )}
      <Text as="span" fontSize="11px" fontWeight="800" letterSpacing="0.6px">
        {rotulo}
      </Text>
    </Flex>
  );

  return (
    <Table.Row bg={fundo}>
      {/* 🔴 Uma célula só, atravessando a tabela: é o que faz a faixa ir de
          ponta a ponta mesmo com a rolagem horizontal. */}
      <Table.Cell
        colSpan={quantasColunas}
        p="10px 14px"
        bg={fundo}
        color={cor}
        borderBottomWidth="1px"
        borderBottomColor="border.subtle"
        position="sticky"
        left="0"
      >
        {onAlternar && natureza ? (
          <BotaoNu
            type="button"
            onClick={() => onAlternar(natureza)}
            aria-expanded={!dobrada}
            color={cor}
            display="flex"
            alignItems="center"
          >
            {nome}
          </BotaoNu>
        ) : (
          nome
        )}
      </Table.Cell>
    </Table.Row>
  );
}
