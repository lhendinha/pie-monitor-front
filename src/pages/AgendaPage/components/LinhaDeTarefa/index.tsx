import { Box, Flex, Text } from "@chakra-ui/react";

import { BotaoNu } from "../../../../components";

import { CORES_DA_PRIORIDADE } from "../../../../constants";
import { mascararNumeroProcesso } from "../../../../utils";
import type { Tarefa } from "../../../../types";

interface LinhaDeTarefaProps {
  tarefa: Tarefa;
  concluida: boolean;
  /** Em que coluna do quadro a tarefa está ("A Fazer", "Fazendo"…).
   *
   * A Agenda não tem colunas, então esta é a única forma de saber em que pé
   * a tarefa está sem abri-la -- e é a primeira metade do `meta` do
   * artifact. */
  nomeDaColuna?: string;
  /** Assunto do atendimento vinculado, quando houver. A tarefa guarda só o
   * id, e quem resolve o nome é a página. */
  assuntoDoAtendimento?: string;
  onAbrir: (tarefa: Tarefa) => void;
  /** Última da lista não desenha a divisória de baixo. */
  ultima?: boolean;
}

/** Uma linha de tarefa na Agenda (`.agenda-list-item` do artifact).
 *
 * A mesma marcação nas TRÊS visões que listam -- dia, lista e o cartão de
 * hoje. Um componente só porque três cópias divergiriam no primeiro ajuste,
 * e o artifact usa deliberadamente a mesma linha nas três.
 *
 * É um `<button>`, não uma `<div>` clicável: abrir a tarefa é a ação
 * principal da linha, e teclado precisa alcançá-la.
 */
export default function LinhaDeTarefa({
  tarefa,
  concluida,
  nomeDaColuna,
  assuntoDoAtendimento,
  onAbrir,
  ultima,
}: LinhaDeTarefaProps) {
  const cor = CORES_DA_PRIORIDADE[tarefa.prioridade] ?? "fg.subtle";

  /* A segunda linha, como no artifact: coluna e vínculo separados por "·",
     pulando o que não existir. Vínculo é um OU outro na apresentação -- os
     dois cabem no dado, mas a linha tem uma frase só. */
  const vinculo = tarefa.processo_numero
    ? mascararNumeroProcesso(tarefa.processo_numero)
    : assuntoDoAtendimento;
  const detalhe = [nomeDaColuna, vinculo].filter(Boolean).join(" · ");

  return (
    <BotaoNu
      type="button"
      onClick={() => onAbrir(tarefa)}
      display="flex"
      alignItems="center"
      gap="12px"
      w="100%"
      textAlign="left"
      px="4px"
      py="11px"
      borderBottomWidth={ultima ? "0" : "1px"}
      borderBottomStyle="solid"
      borderBottomColor="border.subtle"
      _hover={{ bg: "bg.subtle" }}
    >
      {/* `minW=0` pra que o texto longo possa encolher e reticenciar em vez
          de esticar a linha e empurrar a etiqueta pra fora. */}
      <Box flex="1" minW="0">
        <Text
          fontWeight="700"
          fontSize="13px"
          truncate
          textDecoration={concluida ? "line-through" : undefined}
          color={concluida ? "fg.subtle" : undefined}
        >
          {tarefa.titulo}
        </Text>
        {detalhe && (
          <Text fontSize="11.5px" color="fg.muted" mt="2px" truncate>
            {detalhe}
          </Text>
        )}
      </Box>

      <Flex align="center" gap="5px" flexShrink="0">
        <Box w="8px" h="8px" borderRadius="full" bg={cor} aria-hidden="true" />
        <Text fontSize="11.5px" fontWeight="700" color="fg.muted" whiteSpace="nowrap">
          {tarefa.prioridade}
        </Text>
      </Flex>
    </BotaoNu>
  );
}
