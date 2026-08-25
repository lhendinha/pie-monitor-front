import { Box, Text } from "@chakra-ui/react";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  AreaAtualizando,
  Cartao,
  EstadoVazio,
  EstadoDeErro,
  Esqueleto,
  Pagination,
} from "../../../../components";
import { listarTarefas } from "../../../../services";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contar } from "../../../../utils";
import LinhaDeTarefa from "../LinhaDeTarefa";
import { TAMANHOS_PAGINA_CARD, TAMANHO_PAGINA_CARD_PADRAO } from "../../constants";
import type { Tarefa } from "../../../../types";
import type { FiltroDoCard } from "../../types";
import type {
  RespostaDeTarefasPaginada,
} from "../../../../types/respostas";

interface CardDeTarefasProps {
  titulo: string;
  /** Filtro que define o card. `responsavel: "eu"` ou
   * `semResponsavel: true` -- os dois já resolvidos no servidor. */
  filtro: FiltroDoCard;
  vazio: string;
  acao?: (tarefa: Tarefa) => ReactNode;
  responsavel?: (tarefa: Tarefa) => ReactNode;
}

/** Um card de lista de tarefas da Área de trabalho.
 *
 * Os dois cards são o mesmo componente com filtro diferente: "Minhas
 * tarefas" e "Disponíveis para assumir" só divergem no que pedem ao
 * servidor e na ação de cada linha.
 *
 * `apenas_abertas` sempre: aqui a lista é do que ainda há por fazer.
 * Concluída sai da lista, e não fica riscada -- riscar é da Agenda, que
 * mostra o dia inteiro.
 */
export default function CardDeTarefas({
  titulo,
  filtro,
  vazio,
  acao,
  responsavel,
}: CardDeTarefasProps) {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number>(TAMANHO_PAGINA_CARD_PADRAO);

  const parametros = { ...filtro, apenasAbertas: true, pagina, tamanhoPagina };
  const query = useQuery<RespostaDeTarefasPaginada>({
    queryKey: qk.tarefas(parametros),
    /* Mantém a página anterior na tela enquanto a nova vem. Sem isto a
       `queryKey` muda, a chave nasce fria, `isPending` vira `true` e a
       tabela DESMONTA -- pisca a cada página, a cada filtro e a cada tecla
       da busca. O `AreaAtualizando` em volta é que diz que o conteúdo
       visível ainda é o antigo. */
    placeholderData: keepPreviousData,
    queryFn: () => listarTarefas(parametros),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar "${titulo}".`);

  const tarefas = query.data?.tarefas || [];
  const total = query.data?.total ?? 0;

  return (
    <Cartao
      titulo={titulo}
      /* A contagem no cabeçalho é do TOTAL, não da página: é ela que
         responde "quanto tenho pela frente", e a página só mostra os
         primeiros. */
      acoes={
        total > 0 ? (
          <Text fontSize="11.5px" fontWeight="700" color="fg.subtle" fontFamily="mono">
            {contar(total, "tarefa", "tarefas")}
          </Text>
        ) : undefined
      }
    >
      {query.isError ? (
        /* "Nenhuma tarefa atribuída a você" numa falha de rede é o pior
           recado possível nesta tela: ela existe pra dizer o que há por
           fazer, e o vazio dela é uma boa notícia -- falsa. */
        <EstadoDeErro
          mensagem={`Não foi possível carregar "${titulo}".`}
          onTentarDeNovo={() => query.refetch()}
          tentando={query.isFetching}
        />
      ) : query.isPending ? (
        <Esqueleto linhas={2} />
      ) : tarefas.length === 0 ? (
        <EstadoVazio mensagem={vazio} />
      ) : (
        <Box>
          {/* Aqui o apagado importa DUAS vezes: os dois cards paginam
              independente na mesma coluna, e sem manter a página anterior o
              card colapsava de altura e o layout saltava. */}
          <AreaAtualizando atualizando={query.isPlaceholderData}>
            {tarefas.map((t) => (
              <LinhaDeTarefa
                key={`${t.subgrupo_id}-${t.tarefa_id}`}
                tarefa={t}
                acao={acao?.(t)}
                responsavel={responsavel?.(t)}
              />
            ))}
          </AreaAtualizando>
          <Pagination
            pagina={pagina}
            totalPaginas={query.data?.total_paginas ?? 0}
            total={total}
            tamanhoPagina={tamanhoPagina}
            tamanhos={TAMANHOS_PAGINA_CARD}
            onMudarPagina={setPagina}
            onMudarTamanho={(t) => {
              setTamanhoPagina(t);
              setPagina(1);
            }}
          />
        </Box>
      )}
    </Cartao>
  );
}
