import { Flex, Stack, Text } from "@chakra-ui/react";

import { EtiquetaDePrazo } from "../../../../components";
import { NATUREZA_ENTRADA } from "../../../../constants";
import { formatarCentavos } from "../../../../utils";
import type { LinhaDeVencimentoProps } from "./types";

/** Um lançamento a vencer, na Área de trabalho -- o molde da `LinhaDeTarefa`,
 * com dinheiro no lugar do responsável.
 *
 * 🔴 **O sinal do valor é a COR, e não um "-" na frente.** Verde entra,
 * vermelho sai; um menos some numa lista de varredura, e a cor se lê sem
 * ler. É a mesma régua da lista de Lançamentos.
 *
 * ⚠️ **A etiqueta de prazo é a MESMA das tarefas** (`EtiquetaDePrazo`), e
 * não uma etiqueta de situação: aqui a pergunta é "quando vence", e o card
 * só traz aberto -- situação seria a mesma palavra em todas as linhas.
 */
export default function LinhaDeVencimento({ lancamento, acao }: LinhaDeVencimentoProps) {
  const eEntrada = lancamento.natureza === NATUREZA_ENTRADA;

  return (
    <Flex
      align="center"
      gap="12px"
      p="13px 4px"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
    >
      {acao}

      <Stack gap="2px" flex="1" minW="0">
        <Text fontSize="13.5px" fontWeight="700" lineClamp={1}>
          {lancamento.descricao}
        </Text>
        {/* Quem paga ou recebe: a contraparte em texto OU o nome do cliente,
            que o servidor já manda resolvido. Vazio nos dois quando não há
            nem um nem outro -- e aí a linha fica só com a descrição, em vez
            de uma linha de apoio em branco.

            ⚠️ `lineClamp={1}` porque nome de empresa é longo: sem ele
            "Construtora Alfa Empreendimentos e Participações Ltda" empurra o
            valor e a etiqueta para fora. */}
        {(lancamento.contraparte || lancamento.cliente_nome) && (
          <Text fontSize="12px" color="fg.subtle" lineClamp={1}>
            {lancamento.contraparte || lancamento.cliente_nome}
          </Text>
        )}
      </Stack>

      <Flex align="center" gap="10px" flexShrink={0}>
        <Text
          fontSize="13px"
          fontWeight="700"
          fontFamily="mono"
          whiteSpace="nowrap"
          color={eEntrada ? "status.good.text" : "status.bad.text"}
        >
          R$ {formatarCentavos(lancamento.valor_centavos)}
        </Text>
        <EtiquetaDePrazo data={lancamento.data_vencimento} />
      </Flex>
    </Flex>
  );
}
