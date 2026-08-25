import { Flex, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import {
  Botao,
  CabecalhoDePagina,
  CartaoDeTabela,
  AreaAtualizando,
  EstadoVazio,
  EstadoDeErro,
  Esqueleto,
  Modal,
  Pagination,
  useToast,
} from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { ApiError, listarHistorico } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { contar } from "../../utils";
import DetalheHistorico from "./components/DetalheHistorico";
import FiltroDeTipo from "./components/FiltroDeTipo";
import ItemDeHistorico from "./components/ItemDeHistorico";
import { TIPO_DE_ENVIO_PADRAO } from "./constants";
import type { DeepLinkHistorico, HistoricoItem } from "../../types";
import type { AlvoDoDeepLink } from "./types";
import type {
  RespostaDeHistorico,
  RespostaDeHistoricoPaginada,
  RespostaDeTotal,
} from "../../types/respostas";

interface HistoricoPageProps {
  deepLink?: DeepLinkHistorico | null;
  /** Com que filtro a tela abre, quando quem navegou até aqui já sabe.
   *
   * Vem da Área de trabalho: "Envios com falha" cruza os dois tipos, então
   * ela manda `""` (todos). Sem isso, o clique caía em Movimentações e o
   * número da tela não batia com o número clicado. Só vale na PRIMEIRA
   * montagem -- depois quem manda é o filtro da própria tela. */
  tipoEnvioInicial?: string;
  onDeepLinkConsumido?: () => void;
}

/** Histórico dos e-mails que o sistema mandou.
 *
 * A tela abre filtrada em Movimentações: é o que se olha no dia a dia, e
 * lembrete é diário -- sem filtro ele dominaria a lista.
 */
export default function HistoricoPage({
  deepLink,
  tipoEnvioInicial,
  onDeepLinkConsumido,
}: HistoricoPageProps) {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [tipoEnvio, setTipoEnvio] = useState<string>(
    tipoEnvioInicial ?? TIPO_DE_ENVIO_PADRAO,
  );
  const [itemAberto, setItemAberto] = useState<HistoricoItem | null>(null);
  const toast = useToast();

  const query = useQuery<RespostaDeHistoricoPaginada>({
    queryKey: qk.historico({ pagina, tamanhoPagina, tipoEnvio }),
    /* Mantém a página anterior na tela enquanto a nova vem. Sem isto a
       `queryKey` muda, a chave nasce fria, `isPending` vira `true` e a
       tabela DESMONTA -- pisca a cada página, a cada filtro e a cada tecla
       da busca. O `AreaAtualizando` em volta é que diz que o conteúdo
       visível ainda é o antigo. */
    placeholderData: keepPreviousData,
    queryFn: () => listarHistorico({ pagina, tamanhoPagina, tipoEnvio }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar o histórico.");
  const historico = query.data?.historico || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  /** Total sem filtro nenhum -- é o "de Y" da contagem. Uma página de
   * tamanho 1: só o `total` do envelope interessa, e o React Query mantém
   * em cache. */
  const totalQuery = useQuery<RespostaDeTotal>({
    queryKey: qk.historico({ pagina: 1, tamanhoPagina: 1, tipoEnvio: "" }),
    queryFn: () => listarHistorico({ pagina: 1, tamanhoPagina: 1 }),
  });
  const totalSemFiltro = totalQuery.data?.total ?? 0;

  /** Resolução do link do e-mail -- SEPARADA da consulta paginada, pra nunca
   * bloquear nem substituir a lista principal. Busca todos os registros
   * daquele processo (não a página atual) e acha o que bate com o
   * `comunicacao_id` do link.
   *
   * É uma ação de uma vez só, e não um dado declarativo de render, por isso
   * é mutation e não query -- e as variáveis vão como argumento do `mutate`
   * (sem fechar sobre a prop) pra não pegar um `deepLink` desatualizado se
   * ele mudar antes de a resposta chegar. */
  const deepLinkMutation = useMutation({
    mutationFn: (variaveis: AlvoDoDeepLink) =>
      listarHistorico({ numeroProcesso: variaveis.processo }) as Promise<RespostaDeHistorico>,
    onSuccess: (d, variaveis) => {
      const encontrado = (d.historico || []).find(
        (h) => String(h.comunicacao_id) === variaveis.comunicacaoId,
      );
      if (encontrado) setItemAberto(encontrado);
      else toast.erro("Não foi possível localizar a notificação do link recebido.");
    },
    onError: (err) => {
      if (!(err instanceof ApiError && err.status === 401)) {
        toast.erro("Não foi possível carregar os detalhes do link recebido.");
      }
    },
    onSettled: () => onDeepLinkConsumido?.(),
  });

  useEffect(() => {
    if (!deepLink) return;
    deepLinkMutation.mutate({ processo: deepLink.processo, comunicacaoId: deepLink.comunicacaoId });
    // Deps proposital: só `deepLink`. É resolvido uma vez (o App zera o
    // estado depois, via `onDeepLinkConsumido`, pra não reabrir sozinho numa
    // próxima visita), não a cada mudança de toast/mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink]);

  function handleMudarTipo(novo: string) {
    setTipoEnvio(novo);
    setPagina(1);
  }

  return (
    <>
      <CabecalhoDePagina
        titulo="Histórico"
        subtitulo="Movimentações detectadas e notificações enviadas."
      />

      <Flex align="center" gap="8px" wrap="wrap" mb="18px">
        <FiltroDeTipo valor={tipoEnvio} onMudar={handleMudarTipo} />
      </Flex>

      {/* Some enquanto carrega, em vez de dizer "carregando…": o esqueleto
          logo abaixo já é o recado, e duas mensagens da mesma espera na
          mesma tela é ruído. Mantém a linha ocupando o espaço pra a
          contagem não empurrar a tabela ao chegar. */}
      <Text fontSize="11.5px" color="fg.subtle" mb="10px" minH="17px">
        {query.isPending
          ? ""
          : `Mostrando ${total} de ${contar(totalSemFiltro, "envio", "envios")}`}
      </Text>

      {query.isPending ? (
        <Esqueleto linhas={4} />
      ) : query.isError ? (
        /* Sem isto a tela dizia "Nenhum e-mail enviado ainda" numa falha de
           rede -- e, como `totalSemFiltro` também caía pra 0, nem o "Ver
           todos os envios" aparecia pra desmentir. */
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar o histórico."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <CartaoDeTabela>
          {historico.length === 0 ? (
            /* Vazio por filtro é diferente de vazio de verdade -- e como a
               tela abre filtrada, "não tem nada" costuma ser mentira. Por
               isso o caminho de saída fica junto do recado. */
            <EstadoVazio
              mensagem={
                totalSemFiltro > 0
                  ? "Nenhum envio deste tipo."
                  : "Nenhum e-mail enviado ainda. Os avisos de movimentação e de prazo aparecem aqui."
              }
              acao={
                totalSemFiltro > 0 && (
                  <Botao variante="ghost" onClick={() => handleMudarTipo("")}>
                    Ver todos os envios
                  </Botao>
                )
              }
            />
          ) : (
            <>
              <AreaAtualizando atualizando={query.isPlaceholderData}>
                {historico.map((h, i) => (
                  <ItemDeHistorico
                    key={`${h.numero_processo}-${h.enviado_em}-${i}`}
                    item={h}
                    onAbrir={setItemAberto}
                  />
                ))}
              </AreaAtualizando>
              <Pagination
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={total}
                tamanhoPagina={tamanhoPagina}
                onMudarPagina={setPagina}
                onMudarTamanho={(t) => {
                  setTamanhoPagina(t);
                  setPagina(1);
                }}
              />
            </>
          )}
        </CartaoDeTabela>
      )}

      {/* O modal abre JÁ na resolução do link do e-mail, não só quando o
          registro é encontrado. Quem chega por um link vindo de fora não
          tem contexto nenhum: sem isto ela cai numa lista comum, sem nada
          indicando que o item do link está sendo buscado -- e se falhar, só
          um toast que ela pode nem associar ao link. */}
      {(itemAberto || deepLinkMutation.isPending) && (
        <Modal
          titulo="Detalhes do envio"
          onFechar={() => setItemAberto(null)}
        >
          {itemAberto ? (
            <DetalheHistorico item={itemAberto} />
          ) : (
            <Stack gap="14px" py="6px">
              <Text fontSize="13.5px" color="fg.subtle">
                Localizando a notificação do link recebido…
              </Text>
              <Esqueleto linhas={3} altura="20px" />
            </Stack>
          )}
        </Modal>
      )}
    </>
  );
}
