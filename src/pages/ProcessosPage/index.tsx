import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { listarProcessos } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { CartaoDeTabela, Pagination, Esqueleto } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { INTERVALO_POLLING_PROCESSOS_MS } from "./constants/processos";
import CabecalhoProcessos from "./components/CabecalhoProcessos";
import TabelaProcessos from "./components/TabelaProcessos";
import NovoProcessoForm from "./components/NovoProcessoForm";
import { useCatalogosDeProcesso } from "../../hooks/useCatalogosDeProcesso";
import { useFiltrosProcessos } from "./hooks/useFiltrosProcessos";
import type { FiltrosProcessos, Processo } from "../../types";

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
  const filtrosIniciais = (state as { filtros?: Partial<FiltrosProcessos> } | null)?.filtros;

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);

  const f = useFiltrosProcessos(filtrosIniciais);
  const apoio = useCatalogosDeProcesso();
  const queryClient = useQueryClient();

  const parametrosBusca = f.filtroAtivo ? f.filtros : { pagina, tamanhoPagina };

  const processosQuery = useQuery<{
    processos: Processo[];
    total: number;
    total_paginas: number;
  }>({
    queryKey: qk.processos(parametrosBusca),
    queryFn: () => listarProcessos(parametrosBusca),
    refetchInterval: INTERVALO_POLLING_PROCESSOS_MS,
  });
  useToastOnQueryError(processosQuery.error, "Não foi possível carregar os processos.");

  /** Total do grupo sem filtro nenhum -- é o "de Y" da contagem
   * ("Mostrando 3 de 11 processos"). Uma página de tamanho 1: só o `total`
   * do envelope interessa, e o React Query mantém em cache. */
  const totalQuery = useQuery<{ total: number }>({
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
      ) : (
        /* Tabela e paginação dentro do MESMO cartão, como no artifact: lá o
           `.table-card` só fecha depois da barra de páginas. Separados, a
           paginação virava um bloco solto embaixo da tabela. */
        <CartaoDeTabela>
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
          {!f.filtroAtivo && processos.length > 0 && (
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
