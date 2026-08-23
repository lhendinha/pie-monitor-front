import { Box, Flex, Text } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  BotaoQuadrado,
  IconeArrastar,
  IconeCheck,
  IconeLixeira,
  NomeEditavel,
} from "../../../../components";
import { contar } from "../../../../utils";
import type { ColunaDoQuadro } from "../../../../types";

interface LinhaDeColunaProps {
  coluna: ColunaDoQuadro;
  /** Quantas tarefas estão nela hoje -- é o número que a pessoa precisa ver
   * antes de excluir, porque elas vão pra coluna anterior. */
  tarefas: number;
  editando: boolean;
  /** Alguma ação DESTA linha está em voo. */
  emAndamento: boolean;
  /** Excluir a última coluna deixaria o quadro sem nenhuma -- o servidor
   * recusa, e a lixeira nem aparece. */
  podeExcluir: boolean;
  onIniciarRenome: () => void;
  onRenomear: (nome: string) => void;
  onCancelarRenome: () => void;
  onMarcarConclusao: () => void;
  onExcluir: () => void;
}

/** Uma coluna na lista do "Editar quadro".
 *
 * A alça de arrastar é um botão de verdade, e não a linha inteira: o
 * `dnd-kit` liga navegação por teclado nela (Espaço pega, setas movem) --
 * mesma decisão da lista de Fases/Situações.
 */
export default function LinhaDeColuna({
  coluna,
  tarefas,
  editando,
  emAndamento,
  podeExcluir,
  onIniciarRenome,
  onRenomear,
  onCancelarRenome,
  onMarcarConclusao,
  onExcluir,
}: LinhaDeColunaProps) {
  /* As duas do FIM não se movem: o servidor recusa (409), e oferecer o
     gesto que vai falhar é pior que não oferecer. A alça delas some logo
     abaixo, pelo mesmo motivo. */
  const fixa = coluna.e_conclusao || coluna.e_arquivado;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: coluna.coluna_id,
    disabled: emAndamento || fixa,
  });

  return (
    <Flex
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      align="center"
      gap="10px"
      p="10px 4px"
      borderBottomWidth="1px"
      borderBottomColor="border.subtle"
      bg={isDragging ? "bg.canvas" : undefined}
      opacity={isDragging ? 0.85 : 1}
    >
      {fixa ? (
        /* Espaço reservado no lugar da alça: sem ele o nome desalinha das
           outras linhas. */
        <Box w="26px" flexShrink="0" />
      ) : (
        <BotaoQuadrado
          type="button"
          tamanho="compacto"
          aria-label={`Reordenar ${coluna.nome}`}
          cursor="grab"
          {...attributes}
          {...listeners}
        >
          <IconeArrastar />
        </BotaoQuadrado>
      )}

      <NomeEditavel
        key={coluna.nome}
        nome={coluna.nome}
        rotuloDoCampo={`Novo nome de ${coluna.nome}`}
        editando={editando}
        /* Arquivado nem o nome muda: é infraestrutura do arquivamento
           automático, não uma escolha de quem monta o quadro. A conclusão,
           sim -- ali o nome é só texto, e um erro de digitação seria
           impossível de corrigir. */
        podeRenomear={!coluna.e_arquivado}
        salvando={emAndamento}
        onIniciar={onIniciarRenome}
        onConfirmar={onRenomear}
        onCancelar={onCancelarRenome}
      />

      {/* A marca de conclusão vem escrita, e não só como ícone: "o que essa
          coluna tem de diferente" é a pergunta que a lista precisa
          responder de relance. */}
      {(coluna.e_conclusao || coluna.e_arquivado) && (
        <Flex
          align="center"
          gap="4px"
          px="7px"
          py="2px"
          borderRadius="full"
          bg={coluna.e_conclusao ? "status.good.bg" : "bg.canvas"}
          color={coluna.e_conclusao ? "status.good" : "fg.subtle"}
          fontSize="10.5px"
          fontWeight="800"
          textTransform="uppercase"
          css={{ "& svg": { width: "11px", height: "11px" } }}
        >
          {coluna.e_conclusao && <IconeCheck />}
          {coluna.e_conclusao ? "conclusão" : "arquivado"}
        </Flex>
      )}

      <Text fontSize="11.5px" color="fg.subtle" fontFamily="mono" ml="auto" flexShrink="0">
        {contar(tarefas, "tarefa", "tarefas")}
      </Text>

      <Flex gap="6px">
        {!fixa && (
          <BotaoQuadrado
            type="button"
            title="Marcar como coluna de conclusão"
            aria-label={`Marcar ${coluna.nome} como coluna de conclusão`}
            disabled={emAndamento}
            onClick={onMarcarConclusao}
          >
            <IconeCheck />
          </BotaoQuadrado>
        )}
        {/* A de conclusão não some: sem ela o quadro fica sem como concluir
            nada, e toda tarefa já concluída viraria aberta de novo. */}
        {podeExcluir && !fixa && (
          <BotaoQuadrado
            type="button"
            tom="perigo"
            title="Excluir coluna"
            aria-label={`Excluir ${coluna.nome}`}
            disabled={emAndamento}
            onClick={onExcluir}
          >
            <IconeLixeira />
          </BotaoQuadrado>
        )}
      </Flex>
    </Flex>
  );
}
