import { Box, Text } from "@chakra-ui/react";

import { mascararNumeroProcesso } from "../../utils";
import type { ListaDoLoteProps } from "./types";

/** Quantas aparecem pelo nome antes do "e mais N" -- o número do artefato. */
const VISIVEIS = 3;

/** Os títulos das tarefas que uma ação em lote vai tocar, dentro da confirmação.
 *
 * 🔴 A frase diz QUANTAS ("Você vai excluir 3 tarefas"); a lista diz QUAIS. É
 * o último lugar onde a pessoa confere se marcou as certas -- e excluir não
 * tem volta. Entrou nas duas confirmações de uma vez, a de excluir e a de
 * concluir: uma com e outra sem, lado a lado, fariam a pessoa procurar a
 * diferença.
 *
 * ⚠️ Só as três primeiras pelo nome, e "e mais N" depois. Com 40 marcadas a
 * lista inteira empurraria o botão de confirmar para fora da tela.
 *
 * ⚠️ É `<ul>`: quem usa leitor de tela ouve "lista, 3 itens" antes dos nomes.
 *
 * ➡️ `PLANO_ACOES_EM_LOTE.md`, Fase 8.
 */
export default function ListaDoLote({ tarefas }: ListaDoLoteProps) {
  if (tarefas.length === 0) return null;
  const visiveis = tarefas.slice(0, VISIVEIS);
  const resto = tarefas.length - visiveis.length;

  return (
    <Box
      as="ul"
      listStyleType="none"
      m="0"
      p="0"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="border"
      borderRadius="md"
      overflow="hidden"
    >
      {visiveis.map((t, indice) => (
        <Box
          as="li"
          key={`${t.subgrupo_id}:${t.tarefa_id}`}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap="10px"
          p="9px 12px"
          /* A última linha não desenha divisória -- a não ser que o "e mais N"
             venha depois dela. */
          borderBottomWidth={indice === visiveis.length - 1 && resto === 0 ? "0" : "1px"}
          borderBottomStyle="solid"
          borderBottomColor="border.subtle"
        >
          {/* `minW=0` para o título longo reticenciar em vez de empurrar o
              número do processo para fora da caixa. */}
          <Text fontSize="12.5px" fontWeight="700" truncate minW="0">
            {t.titulo}
          </Text>
          <Text
            fontSize="11.5px"
            color="fg.subtle"
            flexShrink={0}
            fontFamily={t.processo_numero ? "mono" : undefined}
          >
            {t.processo_numero ? mascararNumeroProcesso(t.processo_numero) : "sem processo"}
          </Text>
        </Box>
      ))}
      {resto > 0 && (
        <Box as="li" p="9px 12px" bg="bg.canvas" color="fg.subtle" fontSize="12.5px" fontWeight="600">
          e mais {resto}
        </Box>
      )}
    </Box>
  );
}
