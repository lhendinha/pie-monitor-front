import { Flex, Text } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  BotaoNu,
  EtiquetaDeMetadado,
  Esqueleto,
  ModalDeTarefa,
  Ponto,
} from "../../../../components";
import { useCatalogosDeProcesso } from "../../../../hooks/useCatalogosDeProcesso";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { formatarData } from "../../../../utils";
import { useTarefasDoProcesso } from "../../hooks/useTarefasDoProcesso";
import type { Tarefa } from "../../../../types";

interface TarefasVinculadasProps {
  numeroProcesso: string;
}

/** As tarefas abertas neste processo.
 *
 * É a única informação da página que não está em nenhuma outra tela: a
 * listagem mostra prazos do processo, não o que alguém marcou pra fazer.
 * Depende do filtro `processo_numero` de `GET /tarefas`, criado em
 * 22/08/2026 justamente pra isto.
 *
 * As linhas ABREM a tarefa (26/08/2026). Antes eram texto morto: a lista
 * dizia que havia três coisas a fazer e não deixava mexer em nenhuma --
 * pra mudar uma data era preciso decorar o título, sair pra Agenda ou pro
 * Kanban e procurar lá.
 */
export default function TarefasVinculadas({ numeroProcesso }: TarefasVinculadasProps) {
  const query = useTarefasDoProcesso(numeroProcesso);
  useToastOnQueryError(query.error, "Não foi possível carregar as tarefas do processo.");

  const queryClient = useQueryClient();
  const [aberta, setAberta] = useState<Tarefa | null>(null);

  /* O mesmo hook que a página já chama. Não custa requisição: as consultas
     de catálogo dividem chave, então a segunda declaração lê do cache. E
     chamar aqui evita atravessar `apoio` inteiro por prop só pra traduzir
     UM id em nome. */
  const apoio = useCatalogosDeProcesso();

  if (query.isPending) return <Esqueleto linhas={2} />;

  // 🔴 Erro não é "não tem tarefa".
  //
  // Sem este ramo, uma falha de rede deixava `data` indefinido, a lista caía
  // pra `[]` e o cartão AFIRMAVA que o processo não tem tarefa nenhuma. O
  // toast some em 4,5s; a afirmação falsa fica. Pior: o diálogo de exclusão
  // desta mesma página já trata `isError` com rigor -- a tela dizia duas
  // coisas diferentes sobre o mesmo dado.
  if (query.isError) {
    return (
      <Text fontSize="13px" color="status.bad.text">
        Não foi possível carregar as tarefas deste processo.
      </Text>
    );
  }

  const tarefas = query.data?.tarefas || [];
  if (tarefas.length === 0) {
    return (
      <Text fontSize="13px" color="fg.subtle">
        Nenhuma tarefa vinculada a este processo.
      </Text>
    );
  }

  return (
    <>
      {tarefas.map((t) => (
        <BotaoNu
          key={t.tarefa_id}
          type="button"
          onClick={() => setAberta(t)}
          display="flex"
          alignItems="center"
          gap="10px"
          w="100%"
          py="7px"
          px="4px"
          borderRadius="sm"
          flexWrap="wrap"
          _hover={{ bg: "bg.canvas" }}
        >
          {/* A bolinha antes de cada tarefa é do artifact (lá é um "•"
              literal). Mesmo componente das outras listas -- as duas listas
              desta página têm que ler igual. */}
          <Ponto />
          <Text
            fontSize="13px"
            flex="1"
            minW="0"
            /* Tachado quando a coluna do quadro conclui. `esta_concluida`
               vem resolvido do servidor -- a tela não conhece as colunas
               deste subgrupo, e antes disso uma tarefa já feita ficava
               indistinguível de uma pendente aqui dentro. */
            textDecoration={t.esta_concluida ? "line-through" : undefined}
            color={t.esta_concluida ? "fg.subtle" : undefined}
          >
            {t.titulo}
          </Text>
          <Flex gap="6px" flexShrink={0}>
            {/* Em que pé a tarefa está. Também derivado no servidor
                (`coluna_nome`): omitido quando o quadro não conhece a
                coluna, em vez de mostrar um id cru. */}
            {t.coluna_nome && <EtiquetaDeMetadado>{t.coluna_nome}</EtiquetaDeMetadado>}
            <EtiquetaDeMetadado>{formatarData(t.data)}</EtiquetaDeMetadado>
            <EtiquetaDeMetadado>{t.prioridade}</EtiquetaDeMetadado>
          </Flex>
        </BotaoNu>
      ))}

      {aberta && (
        <ModalDeTarefa
          tarefa={aberta}
          subgrupoAtual={aberta.subgrupo_id}
          subgrupoAtualNome={apoio.subgrupoNome(aberta.subgrupo_id)}
          onSalvo={() => {
            setAberta(null);
            /* Prefixo, e uma invalidação só: `qk.tarefasDoProcesso`
               COMEÇA com "tarefas", então isto já derruba a lista deste
               cartão junto com Agenda, Kanban e Área de trabalho, que
               podem estar em cache. */
            queryClient.invalidateQueries({ queryKey: ["tarefas"] });
          }}
          onFechar={() => setAberta(null)}
        />
      )}
    </>
  );
}
