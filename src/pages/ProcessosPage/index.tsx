import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listarProcessos, removerProcesso } from "../../services";
import { toastErroMutation, useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { formatarData, mascararNumeroProcesso } from "../../utils";
import { Modal, Pagination, Skeleton, useToast } from "../../components";
import { INTERVALO_POLLING_PROCESSOS_MS, TAMANHO_PAGINA_PADRAO } from "../../constants";
import CabecalhoProcessos from "./CabecalhoProcessos";
import ChipsFiltros from "./ChipsFiltros";
import DetalheEditarProcesso from "./DetalheEditarProcesso";
import DetalheProcesso from "./DetalheProcesso";
import ItemProcesso from "./ItemProcesso";
import NovoProcessoForm from "./NovoProcessoForm";
import PainelFiltros from "./PainelFiltros";
import { useDadosDeApoio } from "./useDadosDeApoio";
import { useFiltrosProcessos } from "./useFiltrosProcessos";
import type { FiltrosEstruturadosProcessos, Processo } from "../../types";

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

  function rotuloFiltro(chave: keyof FiltrosEstruturadosProcessos, valor: string): string {
    if (chave === "clienteId") return apoio.clienteNome(valor);
    if (chave === "faseId") return apoio.faseRotulo(valor);
    if (chave === "situacaoId") return apoio.situacaoRotulo(valor);
    return formatarData(valor);
  }

  return (
    <>
      <CabecalhoProcessos
        carregando={carregando}
        total={total}
        filtroAtivo={f.filtroAtivo}
        busca={f.buscaInput}
        onBuscar={f.setBuscaInput}
        quantidadeFiltros={f.quantidadeAplicados}
        onAlternarPainel={f.alternarPainel}
        onNovoProcesso={() => setModalAberto(true)}
      />

      <PainelFiltros
        aberto={f.painelAberto}
        rascunho={f.rascunho}
        onMudar={(parcial) => f.setRascunho((r) => ({ ...r, ...parcial }))}
        clientes={apoio.clientes}
        fases={apoio.fases}
        situacoes={apoio.situacoes}
        onAplicar={f.aplicar}
        onLimpar={f.limpar}
      />

      <ChipsFiltros aplicados={f.aplicados} rotuloDe={rotuloFiltro} onRemover={f.remover} />

      {carregando ? (
        <Skeleton />
      ) : processos.length === 0 ? (
        <div className="empty">
          {f.filtroAtivo
            ? "Nenhum processo encontrado com esses filtros."
            : "Nenhum processo cadastrado ainda."}
        </div>
      ) : (
        <ul className="docket-list">
          {processos.map((p) => (
            <ItemProcesso
              key={`${p.subgrupo_id}-${p.numero_processo}`}
              processo={p}
              subgrupoNome={apoio.subgrupoNome}
              faseRotulo={apoio.faseRotulo}
              situacaoRotulo={apoio.situacaoRotulo}
              onAbrir={setProcessoEmEdicao}
              onVerHistorico={setNumeroAberto}
              onRemover={handleRemover}
            />
          ))}
        </ul>
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
          />
        </Modal>
      )}
    </>
  );
}
