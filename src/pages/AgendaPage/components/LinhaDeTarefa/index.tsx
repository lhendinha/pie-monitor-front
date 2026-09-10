import { Box, Checkbox, Flex, Text } from "@chakra-ui/react";

import { BotaoNu, EtiquetasDeSubgrupo } from "../../../../components";

import { CORES_DA_PRIORIDADE } from "../../../../constants";
import { mascararNumeroProcesso } from "../../../../utils";
import type { LinhaDeTarefaProps } from "./types";

/** Uma linha de tarefa na Agenda (`.agenda-list-item` do artifact).
 *
 * A mesma marcação nas TRÊS visões que listam -- dia, lista e o cartão de
 * hoje. Um componente só porque três cópias divergiriam no primeiro ajuste,
 * e o artifact usa deliberadamente a mesma linha nas três.
 *
 * É um `<button>`, não uma `<div>` clicável: abrir a tarefa é a ação
 * principal da linha, e teclado precisa alcançá-la.
 *
 * 🔴 **No modo de seleção ela deixa de ser botão e vira o `<label>` da
 * caixa.** Caixa de marcar dentro de `<button>` é conteúdo interativo
 * aninhado: HTML inválido, e o clique fica ambíguo entre abrir e marcar.
 * Como `<label>`, a linha inteira é alvo nativo da caixa -- sem JS de
 * propagação, sem duplo disparo, e o teclado continua chegando pelo input.
 */
export default function LinhaDeTarefa({
  tarefa,
  concluida,
  nomeDaColuna,
  assuntoDoAtendimento,
  subgrupoNome,
  onAbrir,
  ultima,
  selecao,
  semEtiqueta,
}: LinhaDeTarefaProps) {
  const cor = CORES_DA_PRIORIDADE[tarefa.prioridade] ?? "fg.subtle";

  /* A segunda linha, como no artifact: coluna e vínculo separados por "·",
     pulando o que não existir. Vínculo é um OU outro na apresentação -- os
     dois cabem no dado, mas a linha tem uma frase só. */
  const vinculo = tarefa.processo_numero
    ? mascararNumeroProcesso(tarefa.processo_numero)
    : assuntoDoAtendimento;
  const detalhe = [nomeDaColuna, vinculo].filter(Boolean).join(" · ");

  /* A moldura é a MESMA nos dois modos. O que troca é o elemento de fora --
     e é por isso que ela vive num objeto, e não repetida duas vezes. */
  const moldura = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    w: "100%",
    textAlign: "left" as const,
    px: "4px",
    py: "11px",
    borderBottomWidth: ultima ? "0" : "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "border.subtle",
    _hover: { bg: "bg.subtle" },
  };

  const miolo = (
    <>
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

      {/* 🔴 Junto do bloco de metadados da direita, não colado no título: a
          Agenda junta as tarefas de TODOS os seus subgrupos no mesmo dia, e
          aqui é onde a linha já responde "em que pé isto está".

          ⚠️ Este `Flex` tem `flexShrink="0"` e NÃO tem `wrap` -- ao
          contrário do de Atendimentos. Se a etiqueta não couber, ela
          espreme o título em vez de descer. Medido em Chrome antes de
          fechar. */}
      <Flex align="center" gap="8px" flexShrink="0">
        {!semEtiqueta && <EtiquetasDeSubgrupo nomes={[subgrupoNome]} />}
        <Box w="8px" h="8px" borderRadius="full" bg={cor} aria-hidden="true" />
        <Text fontSize="11.5px" fontWeight="700" color="fg.muted" whiteSpace="nowrap">
          {tarefa.prioridade}
        </Text>
      </Flex>
    </>
  );

  if (selecao) {
    return (
      <Checkbox.Root
        {...moldura}
        checked={selecao.marcada}
        onClick={(evento) => {
          /* O Chakra alterna sozinho pelo clique no label; o `preventDefault`
             impede a dupla troca (a dele e a nossa). E o `shiftKey` só existe
             no evento de clique -- `onCheckedChange` recebe o estado novo e
             mais nada, que é onde o Shift+clique morreria calado. */
          evento.preventDefault();
          selecao.onAlternar(evento.shiftKey);
        }}
        aria-label={`Selecionar ${tarefa.titulo}`}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        {miolo}
      </Checkbox.Root>
    );
  }

  return (
    <BotaoNu type="button" onClick={() => onAbrir(tarefa)} {...moldura}>
      {miolo}
    </BotaoNu>
  );
}
