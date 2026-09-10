import { Box, Flex, Text } from "@chakra-ui/react";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

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
import { useNomeDeSubgrupo } from "../../../../hooks/useNomeDeSubgrupo";
import LinhaDeTarefa from "../LinhaDeTarefa";
import { BotaoDeTexto } from "../../../../components";
import { chaveDe } from "../../../../utils";
import { TAMANHOS_PAGINA_CARD, TAMANHO_PAGINA_CARD_PADRAO } from "../../constants";
import { TETO_POR_PAGINA } from "../../../../constants";
import type { Tarefa } from "../../../../types";
import type {
  RespostaDeTarefasPaginada,
} from "../../../../types/respostas";
import type { CardDeTarefasProps } from "./types";

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
  escopo,
  escopoAtivo,
  onSelecionar,
  selecao,
  caixa,
}: CardDeTarefasProps) {
  /* 🔴 O hook fica NESTE card, e não na página. Aqui é diferente das outras
     telas: quem busca as tarefas e mapeia as linhas é o próprio card, que tem
     `useQuery` seu. Atravessar `subgrupoNome` pela página obrigaria a
     `WorkspacePage` a conhecer um dado que ela não usa.

     ⚠️ São DOIS cards na tela, logo duas chamadas -- e ainda assim UMA
     requisição: a chave `qk.todosOsSubgrupos()` é compartilhada e o React
     Query desduplica. Há teste guardando isso em `useNomeDeSubgrupo`. */
  const subgrupoNome = useNomeDeSubgrupo();
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
  const selecionando = escopoAtivo === escopo;
  /** A ordem VISÍVEL, que é a âncora do Shift+clique. */
  const ordemNaTela = tarefas.map(chaveDe);

  /** Todas as que batem o filtro, não só a página.
   *
   * 🔴 Sem isto o link "Selecionar todas as 47" marcaria as 5 da página, e o
   * rótulo mentiria -- numa ação destrutiva, a mentira é cara. O card é quem
   * sabe o filtro, então é ele que busca.
   *
   * ⚠️ Pagina até somar o `total` anunciado, como `useTarefasDaAgenda`: pedir
   * `TETO_POR_PAGINA` e assumir que deu traria uma seleção incompleta sem
   * erro nenhum. O segundo limite é rede de segurança -- se as duas contas
   * discordarem, melhor parar que girar para sempre.
   */
  async function carregarTodas(): Promise<Tarefa[]> {
    const juntas: Tarefa[] = [];
    for (let pag = 1; ; pag += 1) {
      const r = await listarTarefas({
        ...filtro, apenasAbertas: true, pagina: pag, tamanhoPagina: TETO_POR_PAGINA,
      }) as RespostaDeTarefasPaginada;
      juntas.push(...r.tarefas);
      if (juntas.length >= r.total || pag >= r.total_paginas) break;
    }
    return juntas;
  }

  return (
    <Cartao
      titulo={titulo}
      /* A contagem no cabeçalho é do TOTAL, não da página: é ela que
         responde "quanto tenho pela frente", e a página só mostra os
         primeiros. */
      acoes={
        total > 0 ? (
          <Flex align="center" gap="12px">
            {/* 🔴 A entrada SOME enquanto a barra está de pé: a barra é a
                moldura do modo e é ela que carrega o Cancelar. E some
                também quando o OUTRO card está selecionando -- dois modos
                abertos fariam "Excluir 7" não dizer quais sete. */}
            {onSelecionar && !escopoAtivo && (
              <BotaoDeTexto onClick={onSelecionar}>Selecionar</BotaoDeTexto>
            )}
            <Text fontSize="11.5px" fontWeight="700" color="fg.subtle" fontFamily="mono">
              {contar(total, "tarefa", "tarefas")}
            </Text>
          </Flex>
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
          {selecionando && selecao?.(tarefas, total, carregarTodas)}
          {/* Aqui o apagado importa DUAS vezes: os dois cards paginam
              independente na mesma coluna, e sem manter a página anterior o
              card colapsava de altura e o layout saltava. */}
          <AreaAtualizando atualizando={query.isPlaceholderData}>
            {tarefas.map((t) => (
              <LinhaDeTarefa
                key={`${t.subgrupo_id}-${t.tarefa_id}`}
                tarefa={t}
                /* ⚠️ A caixa entra no slot que a linha JÁ TEM. Em
                   "Disponíveis" ele está vazio (não se conclui o que não é
                   seu); em "Minhas tarefas" ela substitui o círculo de
                   concluir enquanto o modo dura. */
                acao={selecionando ? caixa?.(t, ordemNaTela) : acao?.(t)}
                responsavel={responsavel?.(t)}
                subgrupoNome={subgrupoNome(t.subgrupo_id)}
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
