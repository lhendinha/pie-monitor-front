import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { EtiquetaDePrazo, EtiquetasDeSubgrupo } from "../../../../components";
import { mascararNumeroProcesso } from "../../../../utils";
import type { Tarefa } from "../../../../types";

interface LinhaDeTarefaProps {
  tarefa: Tarefa;
  /** Ação à esquerda: o círculo de concluir. */
  acao?: ReactNode;
  /** O que aparece na posição do responsável, logo antes do prazo: as
   * iniciais de quem é dono, ou o avatar vazio que assume a tarefa. */
  responsavel?: ReactNode;
  /** Nome do subgrupo da tarefa. Resolvido pela PÁGINA -- uma consulta para a
   * lista inteira, não uma por linha. */
  subgrupoNome: string;
}

/** Uma tarefa numa lista da Área de trabalho (`.task-row` do artifact).
 *
 * Título e meta cortam com reticências em vez de quebrar linha: a lista é
 * de varredura -- o que importa é bater o olho em quantas há e quando
 * vencem, e linhas de alturas diferentes atrapalham isso.
 */
export default function LinhaDeTarefa({ tarefa, acao, responsavel, subgrupoNome }: LinhaDeTarefaProps) {
  const meta = tarefa.processo_numero
    ? mascararNumeroProcesso(tarefa.processo_numero)
    : tarefa.prioridade;

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
          {tarefa.titulo}
        </Text>
        {/* 🔴 Na linha de APOIO, junto do número do processo -- e não no bloco
            da direita. Aquele é o par "responsável + prazo", e o comentário
            abaixo diz por que ele é deliberado: quem é dono e quando vence se
            leem juntos. Enfiar o subgrupo no meio desfaria a leitura.

            ⚠️ A "Área de trabalho" mistura tarefas de TODOS os subgrupos --
            inclusive as "disponíveis para assumir". Assumir uma tarefa sem
            saber de onde ela vem é o caso mais caro desta frente. */}
        <Flex align="center" gap="7px" minW="0">
          <Text
            fontSize="12px"
            color="fg.subtle"
            lineClamp={1}
            fontFamily={tarefa.processo_numero ? "mono" : undefined}
          >
            {meta}
          </Text>
          <Box flexShrink={0}>
            <EtiquetasDeSubgrupo nomes={[subgrupoNome]} />
          </Box>
        </Flex>
      </Stack>

      {/* Responsável ANTES do prazo, como no artifact: quem é dono e quando
          vence se leem juntos, e o prazo fica encostado na borda. */}
      <Flex align="center" gap="10px" flexShrink={0}>
        {responsavel}
        <EtiquetaDePrazo data={tarefa.data} />
      </Flex>
    </Flex>
  );
}
