import { Box, Flex, Text } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Avatar, EtiquetaDePrazo } from "../../../../components";
import { mascararNumeroProcesso } from "../../../../utils";
import { CORES_DA_PRIORIDADE } from "../../constants/kanban";
import type { Tarefa } from "../../../../types";

interface CartaoDeTarefaProps {
  tarefa: Tarefa;
  /** Apelido de quem é responsável -- a tarefa guarda só o e-mail. */
  responsavel?: string;
  onAbrir: (tarefa: Tarefa) => void;
}

/** Um cartão do quadro (`.kcard` do artifact).
 *
 * A prioridade aparece DUAS vezes: na tarja à esquerda e no ponto ao lado
 * do prazo. Não é redundância -- a tarja se lê varrendo a coluna de cima a
 * baixo, o ponto se lê quando o olho já parou no cartão.
 */
export default function CartaoDeTarefa({ tarefa, responsavel, onAbrir }: CartaoDeTarefaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${tarefa.subgrupo_id}:${tarefa.tarefa_id}`,
    data: { tarefa },
  });

  const cor = CORES_DA_PRIORIDADE[tarefa.prioridade] ?? "fg.subtle";

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      opacity={isDragging ? 0.4 : 1}
      /* ⚠️ Espalhar ANTES das minhas props: o `dnd-kit` traz `role` e
         `tabIndex` próprios, e espalhando depois ele sobrescreveria o
         `role="button"` que faz o cartão abrir por Enter. */
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(tarefa)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir(tarefa);
        }
      }}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border"
      borderLeftWidth="3px"
      borderLeftStyle="solid"
      borderLeftColor={cor}
      borderRadius="md"
      p="12px 12px 12px 14px"
      mb="10px"
      boxShadow="sm"
      cursor="grab"
      _active={{ cursor: "grabbing" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "2px" }}
    >
      <Text fontSize="13px" fontWeight="700" mb="6px">
        {tarefa.titulo}
      </Text>

      {tarefa.processo_numero && (
        <Text fontSize="11px" fontFamily="mono" color="fg.subtle" mb="8px">
          {mascararNumeroProcesso(tarefa.processo_numero)}
        </Text>
      )}

      <Flex align="center" justify="space-between">
        <Flex align="center" gap="5px">
          <Box w="8px" h="8px" borderRadius="full" bg={cor} flex="0 0 auto" aria-hidden="true" />
          <EtiquetaDePrazo data={tarefa.data} />
        </Flex>
        {responsavel && <Avatar nome={responsavel} tamanho="pequeno" />}
      </Flex>
    </Box>
  );
}
