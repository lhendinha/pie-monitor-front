import { Box, Checkbox, Flex, Text } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Avatar, EtiquetaDePrazo } from "../../../../components";
import { mascararNumeroProcesso } from "../../../../utils";
import { CORES_DA_PRIORIDADE } from "../../constants";
import type { CartaoDeTarefaProps } from "./types";

/** Um cartão do quadro (`.kcard` do artifact).
 *
 * A prioridade aparece DUAS vezes: na tarja à esquerda e no ponto ao lado
 * do prazo. Não é redundância -- a tarja se lê varrendo a coluna de cima a
 * baixo, o ponto se lê quando o olho já parou no cartão.
 *
 * 🔴 **Em seleção o cartão deixa de arrastar e vira o `<label>` da caixa.**
 * Sem isso o mesmo apertar-e-mover significaria marcar e mover ao mesmo
 * tempo -- e caixa de marcar dentro de conteúdo interativo é HTML inválido.
 *
 * ⚠️ **O que desliga o arraste é NÃO espalhar `attributes`/`listeners`**, não
 * o `disabled`. Medido em Chrome em 10/09/2026, com o mouse descendo,
 * andando e subindo: trocando `disabled` por `false` o cartão continua
 * parado, porque sem os listeners o `PointerSensor` nunca chega a ativar.
 * O `disabled` fica assim mesmo (`disabled?: boolean | Disabled`,
 * @dnd-kit/sortable 10.0.0) -- é a mesma escolha de `useArrastarTarefa`, que
 * valida o destino dos dois lados: barato, e é ele que segura o dia em que
 * alguém devolver os `attributes` para o cartão por causa do teclado.
 *
 * ➡️ `scripts/verificar-selecao-no-kanban.mjs` -- em jsdom o dnd-kit não
 * arrasta, então o par ("fora do modo move, dentro não") só existe lá.
 */
export default function CartaoDeTarefa({ tarefa, responsavel, onAbrir, selecao }: CartaoDeTarefaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${tarefa.subgrupo_id}:${tarefa.tarefa_id}`,
    data: { tarefa },
    disabled: Boolean(selecao),
  });

  const cor = CORES_DA_PRIORIDADE[tarefa.prioridade] ?? "fg.subtle";

  /* A moldura é a MESMA nos dois modos -- o que troca é o elemento de fora.
     Por isso ela vive num objeto, e não repetida duas vezes. */
  const moldura = {
    bg: "bg.surface",
    borderWidth: "1px",
    borderColor: "border",
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    borderLeftColor: cor,
    borderRadius: "md",
    p: "12px 12px 12px 14px",
    mb: "10px",
    boxShadow: "sm",
    _focusVisible: { outline: "2px solid", outlineColor: "fg.brand", outlineOffset: "2px" },
  };

  const miolo = (
    <>
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
    </>
  );

  if (selecao) {
    return (
      <Checkbox.Root
        ref={setNodeRef}
        {...moldura}
        display="flex"
        alignItems="flex-start"
        gap="10px"
        cursor="pointer"
        checked={selecao.marcada}
        onClick={(evento) => {
          /* O Chakra alterna sozinho pelo clique no label; o `preventDefault`
             impede a dupla troca. E o `shiftKey` só existe no evento de
             clique -- `onCheckedChange` recebe o estado novo e mais nada. */
          evento.preventDefault();
          selecao.onAlternar(evento.shiftKey);
        }}
        aria-label={`Selecionar ${tarefa.titulo}`}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control mt="2px" flexShrink={0} />
        {/* `minW=0` pra o título longo reticenciar em vez de esticar o cartão
            e estourar a largura da coluna. */}
        <Box flex="1" minW="0">
          {miolo}
        </Box>
      </Checkbox.Root>
    );
  }

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
      {...moldura}
      cursor="grab"
      _active={{ cursor: "grabbing" }}
    >
      {miolo}
    </Box>
  );
}
