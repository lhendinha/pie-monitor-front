import { Flex, Stack, Text } from "@chakra-ui/react";

import { useEstadoNaUrl } from "../../hooks/useEstadoNaUrl";
import { usePaginacaoDaLista } from "../../hooks/usePaginacaoDaLista";
import { useParametrosDaUrl } from "../../hooks/useParametrosDaUrl";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { Botao, CabecalhoDePagina, CartaoDeTabela, AreaAtualizando, EstadoVazio, EstadoDeErro, Esqueleto, IconePlus, Modal, ModalDeTarefa, Pagination } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import { ApiError, listarHistorico } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { useNomesDeSubgruposVisiveis } from "../../hooks/useNomeDeSubgrupo";
import { contar, mascararNumeroProcesso } from "../../utils";
import DetalheHistorico from "./components/DetalheHistorico";
import FiltroDeMenu from "./components/FiltroDeMenu";
import ItemDeHistorico from "./components/ItemDeHistorico";
import {
  FILTROS_DE_FALHA,
  FILTROS_DE_PERIODO,
  TIPOS_DE_ENVIO,
  TIPO_DE_ENVIO_PADRAO,
} from "./constants";
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
  /** Idem, pros dois filtros que a home aciona.
   *
   * "Envios com falha" manda `{ tipoEnvio: "", apenasComFalha: true }` -- a
   * falha cruza os dois tipos. "Movimentações (N dias)" manda
   * `{ tipoEnvio: "movimentacao", dias: DIAS_DA_JANELA_RECENTE }`. Sem eles,
   * o clique abria uma lista MAIOR que o número clicado: medido em
   * 26/08/2026, 2 contra 6 e 3 contra 4. */
  apenasComFalhaInicial?: boolean;
  diasInicial?: number;
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
  apenasComFalhaInicial,
  diasInicial,
  onDeepLinkConsumido,
}: HistoricoPageProps) {
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } = usePaginacaoDaLista();
  /* ⚠️ Os filtros vão para a URL JUNTO com a página: restaurar a página sem
     o filtro que a produziu mostraria uma página diferente.

     ⚠️ O valor que vem por PROP (o link da Área de trabalho) é o padrão do
     parâmetro -- é assim que a tela abre já filtrada sem sujar a URL. E
     "limpar filtros" continua exprimível porque o codec escreve tudo que
     DIFERE do padrão, inclusive `falha=0`. */
  /* 🔴 Os padrões num lugar SÓ. Eles aparecem duas vezes -- ao declarar cada
     filtro e ao limpar todos -- e o que some da URL é justamente o que
     coincide com eles. Repetidos à mão, "limpar" grava o que ele acha que é
     o padrão, o parâmetro é omitido, e a leitura devolve o filtro de volta:
     o botão parece não funcionar. */
  const PADROES = {
    tipo: tipoEnvioInicial ?? TIPO_DE_ENVIO_PADRAO,
    falha: apenasComFalhaInicial ?? false,
    dias: diasInicial ?? 0,
  };
  const [tipoEnvio, setTipoEnvio] = useEstadoNaUrl("tipo", PADROES.tipo, {
    tambemApaga: ["pagina"],
  });
  const [apenasComFalha, setApenasComFalha] = useEstadoNaUrl("falha", PADROES.falha, {
    tambemApaga: ["pagina"],
  });
  const [dias, setDias] = useEstadoNaUrl("dias", PADROES.dias, {
    tambemApaga: ["pagina"],
  });
  const { atualizar } = useParametrosDaUrl();

  /* UMA vez na página, não uma por item. ⚠️ `Visiveis` e não `Nome`: aqui a
     lista pode conter subgrupo que a pessoa não participa, e o comportamento
     tem de ser DESCARTAR, não cair para o id. Ver o hook. */
  const subgruposVisiveis = useNomesDeSubgruposVisiveis();
  const [itemAberto, setItemAberto] = useState<HistoricoItem | null>(null);
  const [criandoTarefa, setCriandoTarefa] = useState(false);

  /** De qual subgrupo a tarefa nasceria -- `null` quando não há resposta
   * certa, e aí o botão não aparece. Ver o comentário no modal abaixo.
   *
   * 🔴 `subgrupos_notificados` é OPCIONAL e é uma LISTA: são três estados
   * (ausente, um, vários), não dois. Um `[0]` cru estouraria no ausente e
   * escolheria errado no plural. */
  const notificados = itemAberto?.subgrupos_notificados;
  const subgrupoDaTarefa =
    itemAberto && !itemAberto.tarefa_id && notificados?.length === 1 ? notificados[0] : null;
  const toast = useToast();

  const query = useQuery<RespostaDeHistoricoPaginada>({
    queryKey: qk.historico({ pagina, tamanhoPagina, tipoEnvio, apenasComFalha, dias }),
    /* Mantém a página anterior na tela enquanto a nova vem. Sem isto a
       `queryKey` muda, a chave nasce fria, `isPending` vira `true` e a
       tabela DESMONTA -- pisca a cada página, a cada filtro e a cada tecla
       da busca. O `AreaAtualizando` em volta é que diz que o conteúdo
       visível ainda é o antigo. */
    placeholderData: keepPreviousData,
    queryFn: () => listarHistorico({ pagina, tamanhoPagina, tipoEnvio, apenasComFalha, dias }),
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

  /* Voltar pra página 1 a cada filtro: estar na página 4 de um conjunto que
     acabou de encolher pra 2 páginas mostraria vazio sem motivo.

     ⚠️ Quem faz isso agora é o `tambemApaga` de cada filtro, numa escrita
     só -- chamar `setPagina(1)` em seguida partiria da mesma URL e apagaria
     o filtro que acabou de ser escrito. */

  /** O caminho de volta do estado vazio: derruba TODOS os filtros de uma vez.
   *
   * ⚠️ `""` no tipo, e não `TIPO_DE_ENVIO_PADRAO` -- a tela abre em
   * "Movimentações", mas "ver todos" tem que ver todos. Voltar pro padrão
   * deixaria os lembretes de fora e a lista poderia seguir vazia. */
  function limparFiltros() {
    /* ⚠️ Escreve os valores neutros em vez de APAGAR as chaves: apagar
       devolveria o padrão, e aqui o padrão pode ser o filtro que veio da
       Área de trabalho -- "limpar" traria ele de volta. */
    atualizar({ tipo: "", falha: false, dias: 0 }, { tambemApaga: ["pagina"] });
  }

  return (
    <>
      <CabecalhoDePagina
        titulo="Histórico"
        subtitulo="Movimentações detectadas e notificações enviadas."
      />

      <Flex align="center" gap="8px" wrap="wrap" mb="18px">
        <FiltroDeMenu opcoes={TIPOS_DE_ENVIO} valor={tipoEnvio} onMudar={setTipoEnvio} />
        <FiltroDeMenu opcoes={FILTROS_DE_FALHA} valor={apenasComFalha} onMudar={setApenasComFalha} />
        <FiltroDeMenu opcoes={FILTROS_DE_PERIODO} valor={dias} onMudar={setDias} />
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
              /* 🔴 "deste tipo" mentia desde que a tela ganhou mais dois
                 filtros: o vazio pode vir de "Só com falha" ou do recorte de
                 período, e a frase mandava a pessoa olhar pro filtro errado. */
              mensagem={
                totalSemFiltro > 0
                  ? "Nenhum envio com esses filtros."
                  : "Nenhum e-mail enviado ainda. Os avisos de movimentação e de prazo aparecem aqui."
              }
              acao={
                totalSemFiltro > 0 && (
                  /* ⚠️ Limpa os TRÊS. Antes limpava só o tipo -- com "Só com
                     falha" ligado, o botão de saída não saía: a lista seguia
                     vazia e o único caminho de volta não levava a lugar
                     nenhum. */
                  <Botao variante="ghost" onClick={limparFiltros}>
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
                    subgruposVisiveis={subgruposVisiveis}
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
                onMudarTamanho={setTamanhoPagina}
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
      {/* 🔴 O botão só existe quando há UM subgrupo certo pra tarefa nascer.
          Três casos deixam ele de fora, e cada um por um motivo diferente:

          1. LEMBRETE DE TAREFA (`tarefa_id`): não tem processo nenhum --
             `numero_processo` ali guarda `TAREFA#{id}` porque é chave de
             partição. Vincular a tarefa nova a isso gravaria lixo num campo
             que a tela lê como número de processo.
          2. VÁRIOS subgrupos notificados: o mesmo número vive em N
             subgrupos e o e-mail foi pra todos. Escolher um arbitrariamente
             faria a tarefa nascer no lugar errado sem ninguém perceber, e
             `ModalDeTarefa` não tem estado "nenhum subgrupo" -- `subgrupoAtual`
             é obrigatório e semeia o seletor.
          3. AUSENTE: `subgrupos_notificados` é opcional, e registro anterior
             a 26/08/2026 não o tem (9 de 73 medidos em produção). `undefined`
             é "não sei", e não se oferece o que não se sabe. */}
      {(itemAberto || deepLinkMutation.isPending) && (
        <Modal
          descarte="semFormulario"
          titulo="Detalhes do envio"
          onFechar={() => setItemAberto(null)}
          acaoNoCabecalho={
            subgrupoDaTarefa ? (
              <Botao variante="ghost" onClick={() => setCriandoTarefa(true)}>
                <IconePlus />
                Adicionar tarefa
              </Botao>
            ) : undefined
          }
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

      {/* Irmão do modal de detalhe: os dois ficam abertos, e só este sai ao
          salvar -- fechar os dois devolveria a pessoa pra lista sem o envio
          que ela estava lendo. O Escape fecha só o de cima (`pilhaDeModais`). */}
      {criandoTarefa && itemAberto && subgrupoDaTarefa && (
        <ModalDeTarefa
          subgrupoAtual={subgrupoDaTarefa}
          vinculoInicial={{
            tipo: "processo",
            id: itemAberto.numero_processo,
            rotulo: mascararNumeroProcesso(itemAberto.numero_processo),
          }}
          onSalvo={() => setCriandoTarefa(false)}
          onFechar={() => setCriandoTarefa(false)}
        />
      )}
    </>
  );
}
