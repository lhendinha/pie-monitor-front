import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listarProcessos, removerProcesso } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { mascararNumeroProcesso } from "../../utils";
import { Modal, Pagination, Skeleton, useToast } from "../../components";
import { INTERVALO_POLLING_PROCESSOS_MS, TAMANHO_PAGINA_PADRAO } from "../../constants";
import CabecalhoProcessos from "./CabecalhoProcessos";
import DetalheEditarProcesso from "./DetalheEditarProcesso";
import DetalheProcesso from "./DetalheProcesso";
import TabelaProcessos from "./TabelaProcessos";
import NovoProcessoForm from "./NovoProcessoForm";
import { useDadosDeApoio } from "./useDadosDeApoio";
import { useFiltrosProcessos } from "./useFiltrosProcessos";
import type { Processo } from "../../types";

export default function ProcessosPage() {
  const [numeroAberto, setNumeroAberto] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [processoEmEdicao, setProcessoEmEdicao] = useState<Processo | null>(null);

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);

  const f = useFiltrosProcessos();
  const apoio = useDadosDeApoio();
  const toast = useToast();
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

  const removerMutation = useMutation({
    mutationFn: (p: Processo) => removerProcesso(p.subgrupo_id, p.numero_processo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["processos"] }),
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover esse processo."),
  });

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  function handleRemover(p: Processo) {
    if (!window.confirm(`Remover ${mascararNumeroProcesso(p.numero_processo)} desse subgrupo?`)) return;
    removerMutation.mutate(p);
  }

  function invalidarProcessos() {
    queryClient.invalidateQueries({ queryKey: ["processos"] });
  }


  return (
    <>
      <CabecalhoProcessos
        carregando={carregando}
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
        <Skeleton />
      ) : (
        <TabelaProcessos
          processos={processos}
          filtroAtivo={f.filtroAtivo}
          onLimparFiltros={f.limpar}
          subgrupoNome={apoio.subgrupoNome}
          clientesNomes={apoio.clientesNomes}
          faseRotulo={apoio.faseRotulo}
          situacaoRotulo={apoio.situacaoRotulo}
          onAbrir={setProcessoEmEdicao}
        />
      )}

      {!f.filtroAtivo && !carregando && processos.length > 0 && (
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          tamanhoPagina={tamanhoPagina}
          onMudarPagina={setPagina}
          onMudarTamanho={handleMudarTamanho}
        />
      )}

      {numeroAberto && (
        <Modal titulo={mascararNumeroProcesso(numeroAberto)} onFechar={() => setNumeroAberto(null)}>
          <DetalheProcesso numero={numeroAberto} />
        </Modal>
      )}

      {modalAberto && (
        <Modal titulo="Novo Processo" onFechar={() => setModalAberto(false)}>
          <NovoProcessoForm
            subgrupos={apoio.subgrupos}
            onCadastrado={invalidarProcessos}
            onFechar={() => setModalAberto(false)}
          />
        </Modal>
      )}

      {processoEmEdicao && (
        <Modal
          titulo={mascararNumeroProcesso(processoEmEdicao.numero_processo)}
          onFechar={() => setProcessoEmEdicao(null)}
        >
          <DetalheEditarProcesso
            processo={processoEmEdicao}
            onAtualizado={invalidarProcessos}
            onFechar={() => setProcessoEmEdicao(null)}
            onRemover={() => {
              const p = processoEmEdicao;
              setProcessoEmEdicao(null);
              handleRemover(p);
            }}
            onVerHistorico={() => {
              setNumeroAberto(processoEmEdicao.numero_processo);
              setProcessoEmEdicao(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}
