import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { listarProcessos } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import {
  AreaAtualizando,
  CartaoDeTabela,
  EstadoDeErro,
  Pagination,
  Esqueleto,
} from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { INTERVALO_POLLING_PROCESSOS_MS } from "./constants/processos";
import CabecalhoProcessos from "./components/CabecalhoProcessos";
import TabelaProcessos from "./components/TabelaProcessos";
import NovoProcessoForm from "./components/NovoProcessoForm";
import { useCatalogosDeProcesso } from "../../hooks/useCatalogosDeProcesso";
import { useFiltrosProcessos } from "./hooks/useFiltrosProcessos";
import type { FiltrosProcessos } from "../../types";
import type {
  RespostaDeProcessosPaginada,
  RespostaDeTotal,
} from "../../types/respostas";

/** Listagem de processos.
 *
 * O detalhe não vive mais aqui: clicar numa linha NAVEGA pra
 * `/processos/{subgrupo}/{numero}`. Era um modal de edição mais um modal de
 * comunicações, com um botão que fechava o primeiro pra abrir o segundo --
 * e nenhum dos dois sobrevivia a um F5 ou a um link colado, que é
 * exatamente o que o e-mail de lembrete manda.
 */
export default function ProcessosPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const navegar = useNavigate();
  /** A Área de trabalho abre esta tela já filtrada -- clicar em "A verificar
   * até hoje" tem que mostrar exatamente os processos que geraram aquele
   * número. Vem por `state` da navegação, e não por query string, porque é
   * um atalho interno: não é URL pra compartilhar. */
  const { state } = useLocation();
  const navegacao = state as
    | { filtros?: Partial<FiltrosProcessos>; processoEmDestaque?: string }
    | null;
  const filtrosIniciais = navegacao?.filtros;

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);

  const f = useFiltrosProcessos(filtrosIniciais, navegacao?.processoEmDestaque);
  const apoio = useCatalogosDeProcesso();
  const queryClient = useQueryClient();

  /** 🔴 A paginação vai SEMPRE, com ou sem filtro.
   *
   * O servidor passou a paginar a busca filtrada na Fase 1a; aqui os
   * parâmetros de página eram descartados quando havia filtro. Filtrar por
   * uma situação com 40 processos mostrava 10, a contagem dizia 40, e não
   * havia barra de páginas nem seletor de "Por página" -- os outros 30 não
   * tinham como ser vistos. */
  const parametrosBusca = { ...f.filtros, pagina, tamanhoPagina };

  const processosQuery = useQuery<RespostaDeProcessosPaginada>({
    queryKey: qk.processos(parametrosBusca),
    /* Mantém a página anterior na tela enquanto a nova vem. Sem isto a
       `queryKey` muda, a chave nasce fria, `isPending` vira `true` e a
       tabela DESMONTA -- pisca a cada página, a cada filtro e a cada tecla
       da busca. O `AreaAtualizando` em volta é que diz que o conteúdo
       visível ainda é o antigo. */
    placeholderData: keepPreviousData,
    queryFn: () => listarProcessos(parametrosBusca),
    refetchInterval: INTERVALO_POLLING_PROCESSOS_MS,
  });
  useToastOnQueryError(processosQuery.error, "Não foi possível carregar os processos.");

  /** Total do grupo sem filtro nenhum -- é o "de Y" da contagem
   * ("Mostrando 3 de 11 processos"). Uma página de tamanho 1: só o `total`
   * do envelope interessa, e o React Query mantém em cache. */
  const totalQuery = useQuery<RespostaDeTotal>({
    queryKey: qk.processos({ pagina: 1, tamanhoPagina: 1 }),
    queryFn: () => listarProcessos({ pagina: 1, tamanhoPagina: 1 }),
  });
  const totalSemFiltro = totalQuery.data?.total ?? 0;

  const processos = processosQuery.data?.processos || [];
  const total = processosQuery.data?.total ?? 0;
  const totalPaginas = processosQuery.data?.total_paginas ?? 0;
  const carregando = processosQuery.isPending;

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  function invalidarProcessos() {
    queryClient.invalidateQueries({ queryKey: ["processos"] });
  }

  return (
    <>
      <CabecalhoProcessos
        carregando={carregando}
        carregandoCatalogos={apoio.carregandoCatalogos}
        /* Espera entre teclas OU consulta em voo -- as duas são "o que você
           vê não é o que você escreveu". */
        buscando={f.buscaInput !== f.filtros.busca || processosQuery.isPlaceholderData}
        total={total}
        totalSemFiltro={totalSemFiltro}
        busca={f.buscaInput}
        onBuscar={f.setBuscaInput}
        filtros={f.aplicados}
        onMudarFiltro={f.mudar}
        clientes={apoio.clientes}
        fases={apoio.fases}
        situacoes={apoio.situacoes}
        onNovoProcesso={() => setModalAberto(true)}
      />

      {carregando ? (
        <Esqueleto />
      ) : processosQuery.isError ? (
        /* Erro NÃO pode cair no caminho de sucesso: `data?.processos || []`
           deixava a tabela vazia e o `EstadoVazio` então AFIRMAVA "Nenhum
           processo cadastrado ainda" pra quem tem duzentos. O toast que
           dizia a verdade some em 4,5s; a mentira ficava. */
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar os processos."
            onTentarDeNovo={() => processosQuery.refetch()}
            tentando={processosQuery.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        /* Tabela e paginação dentro do MESMO cartão, como no artifact: lá o
           `.table-card` só fecha depois da barra de páginas. Separados, a
           paginação virava um bloco solto embaixo da tabela. */
        <CartaoDeTabela>
          <AreaAtualizando atualizando={processosQuery.isPlaceholderData}>
            <TabelaProcessos
              processos={processos}
              filtroAtivo={f.filtroAtivo}
              onLimparFiltros={f.limpar}
              subgrupoNome={apoio.subgrupoNome}
              clientesNomes={apoio.clientesNomes}
              faseRotulo={apoio.faseRotulo}
              situacaoRotulo={apoio.situacaoRotulo}
              onAbrir={(p) => navegar(`/processos/${p.subgrupo_id}/${p.numero_processo}`)}
            />
          </AreaAtualizando>
          {/* A paginação fica FORA do apagado: é o controle que a pessoa
              acabou de usar, e apagá-lo junto sugeriria que ele também
              parou de funcionar. */}
          {/* 🔴 Sem `!f.filtroAtivo`: o servidor pagina o filtro desde a
              Fase 1a, e esconder a barra tornava inalcançável tudo que
              passasse da primeira página do conjunto filtrado. */}
          {processos.length > 0 && (
            <Pagination
              pagina={pagina}
              totalPaginas={totalPaginas}
              total={total}
              tamanhoPagina={tamanhoPagina}
              onMudarPagina={setPagina}
              onMudarTamanho={handleMudarTamanho}
            />
          )}
        </CartaoDeTabela>
      )}

      {modalAberto && (
        <NovoProcessoForm
          subgrupos={apoio.subgrupos}
          carregandoSubgrupos={apoio.carregandoSubgrupos}
          onCadastrado={invalidarProcessos}
          onFechar={() => setModalAberto(false)}
        />
      )}

    </>
  );
}
