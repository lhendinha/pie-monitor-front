import { Box, Flex, Text } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { BotaoNu, IconeCheck, IconePlus } from "../../../../components";
import CartaoDeTarefa from "../CartaoDeTarefa";
import type { ColunaDoQuadroProps } from "./types";

/** Uma coluna do quadro (`.kcol` do artifact).
 *
 * A coluna inteira é área de solta, não só a lista de cartões: soltar no
 * espaço vazio embaixo do último cartão é o gesto natural pra "põe no fim
 * desta coluna", e limitar o alvo à lista faria a coluna vazia não aceitar
 * nada.
 */
export default function ColunaDoQuadro({
  coluna,
  tarefas,
  onAbrirTarefa,
  onNovaTarefa,
}: ColunaDoQuadroProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: coluna.coluna_id,
    data: { colunaId: coluna.coluna_id },
  });

  return (
    <Box
      ref={setNodeRef}
      flex="1 1 300px"
      minW="280px"
      p="12px"
      borderRadius="lg"
      bg={isOver ? "bg.brand.subtle" : "border.subtle"}
      outline={isOver ? "2px dashed" : undefined}
      outlineColor="fg.brand"
      outlineOffset="-4px"
      transition="background .1s"
    >
      <Flex align="center" gap="8px" p="4px 6px 10px" fontSize="13px" fontWeight="800">
        <Flex align="center" gap="6px" minW="0">
          <Text lineClamp={1}>{coluna.nome}</Text>
          {/* A coluna de conclusão é MARCADA, nunca "a última": com posição
              definindo estado, acrescentar uma coluna no fim reabriria toda
              tarefa concluída. O tique diz qual é. */}
          {coluna.e_conclusao && (
            <Box
              as="span"
              display="inline-flex"
              color="status.good"
              title="Coluna de conclusão"
              css={{ "& svg": { width: "13px", height: "13px" } }}
            >
              <IconeCheck />
            </Box>
          )}
        </Flex>
        <Text
          ml="auto"
          flexShrink={0}
          bg="bg.surface"
          color="fg.muted"
          fontFamily="mono"
          fontSize="11.5px"
          fontWeight="700"
          p="1px 8px"
          borderRadius="full"
          borderWidth="1px"
          borderColor="border"
        >
          {tarefas.length}
        </Text>
      </Flex>

      <SortableContext
        items={tarefas.map((t) => `${t.subgrupo_id}:${t.tarefa_id}`)}
        strategy={verticalListSortingStrategy}
      >
        {tarefas.map((t) => (
          <CartaoDeTarefa
            key={t.tarefa_id}
            tarefa={t}
            /* 🔴 O nome vem NA TAREFA (`responsavel_nome`), resolvido pelo
               servidor pra página pedida. Antes a página baixava todas as
               pessoas do grupo só pra traduzir e-mail em apelido -- e como
               essa lista só vinha pra `manager` pra cima, o cartão de quem é
               `user` mostrava e-mail cru pra sempre, não "enquanto
               carregava". */
            responsavel={t.responsavel_nome || t.responsavel_id || undefined}
            onAbrir={onAbrirTarefa}
          />
        ))}
      </SortableContext>

      <BotaoNu
        type="button"
        onClick={() => onNovaTarefa(coluna.coluna_id)}
        w="100%"
        p="10px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="6px"
        borderWidth="1.5px"
        borderStyle="dashed"
        borderColor="fg.subtle"
        borderRadius="md"
        color="fg.muted"
        fontSize="12.5px"
        fontWeight="700"
        opacity={0.75}
        _hover={{ opacity: 1, borderColor: "fg.brand", color: "brand.dark" }}
        css={{ "& svg": { width: "15px", height: "15px", flex: "0 0 auto" } }}
      >
        <IconePlus />
        Nova atividade
      </BotaoNu>
    </Box>
  );
}
