import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarProcessos,
  removerProcesso,
  listarSubgrupos,
  listarClientes,
  listarOpcoesProcesso,
} from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { mascararNumeroProcesso, formatarDataHoraAmPm, formatarData } from "../../utils";
import { Modal, Skeleton, Pagination, IconeHistorico, InfoTip, Select, useToast } from "../../components";
import {
  TAMANHO_PAGINA_PADRAO,
  TAMANHO_PAGINA_PICKER,
  INTERVALO_POLLING_PROCESSOS_MS,
  FILTROS_PROCESSOS_VAZIOS,
  LABEL_FILTRO_PROCESSOS,
} from "../../constants";
import { temFiltroAtivo } from "../../services/api/processos";
import DetalheProcesso from "./DetalheProcesso";
import NovoProcessoForm from "./NovoProcessoForm";
import DetalheEditarProcesso from "./DetalheEditarProcesso";
import type { Processo, Subgrupo, Cliente, OpcaoProcesso, FiltrosEstruturadosProcessos } from "../../types";

export default function ProcessosPage() {
  // O link do e-mail de notificação agora leva pra aba Histórico (ver
  // HistoricoPage/index.tsx + App.tsx) -- aqui só abre por clique mesmo.
  const [numeroAberto, setNumeroAberto] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [processoEmEdicao, setProcessoEmEdicao] = useState<Processo | null>(null);

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);

  const [buscaInput, setBuscaInput] = useState("");
  // useDeferredValue em vez de debounce manual -- o React adia atualizar
  // esse valor (e portanto o refetch) enquanto o usuário digita rápido,
  // sem precisar de setTimeout/useEffect próprio.
  const busca = useDeferredValue(buscaInput);

  const [painelAberto, setPainelAberto] = useState(false);
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosEstruturadosProcessos>(FILTROS_PROCESSOS_VAZIOS);
  // Rascunho do painel -- só vira "aplicado" (e só aí dispara o fetch) ao
  // clicar em "Aplicar filtros", pra não refazer a busca a cada campo
  // trocado enquanto a pessoa ainda está montando o filtro.
  const [rascunho, setRascunho] = useState<FiltrosEstruturadosProcessos>(FILTROS_PROCESSOS_VAZIOS);

  const toast = useToast();
  const queryClient = useQueryClient();

  const filtros = {
    busca,
    clienteId: filtrosAplicados.clienteId,
    faseId: filtrosAplicados.faseId,
    situacaoId: filtrosAplicados.situacaoId,
    dataVerificarAte: filtrosAplicados.dataVerificarAte,
    prazoFinalAte: filtrosAplicados.prazoFinalAte,
  };
  const filtroAtivo = temFiltroAtivo(filtros);
  const parametrosBusca = filtroAtivo ? filtros : { pagina, tamanhoPagina };

  const processosQuery = useQuery<{ processos: Processo[]; total: number; total_paginas: number }>({
    queryKey: qk.processos(parametrosBusca),
    queryFn: () => listarProcessos(parametrosBusca),
    refetchInterval: INTERVALO_POLLING_PROCESSOS_MS,
  });
  useToastOnQueryError(processosQuery.error, "Não foi possível carregar os processos.");
  const processos = processosQuery.data?.processos || [];
  const total = processosQuery.data?.total ?? 0;
  const totalPaginas = processosQuery.data?.total_paginas ?? 0;
  const carregando = processosQuery.isPending;

  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    // Resolve subgrupo_id -> nome pra qualquer processo listado -- precisa
    // do grupo inteiro, não de 1 página (GET /subgrupos agora é paginado).
    queryKey: qk.subgrupos({ tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data?.subgrupos || [];
  const subgrupoNome = (id: string) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id;

  // Mesmo queryKey/tamanhoPagina de CamposProcesso.tsx -- compartilha cache
  // em vez de refazer o fetch só porque é essa página que está montada.
  const clientesQuery = useQuery<{ clientes: Cliente[] }>({
    queryKey: qk.clientes({ tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarClientes({ tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  const clientes = clientesQuery.data?.clientes || [];
  const clienteNome = (id: string) => clientes.find((c) => c.cliente_id === id)?.nome || id;

  const fasesQuery = useQuery<{ opcoes: OpcaoProcesso[] }>({
    queryKey: qk.opcoesProcesso("fase", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarOpcoesProcesso("fase", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  const fases = fasesQuery.data?.opcoes || [];

  const situacoesQuery = useQuery<{ opcoes: OpcaoProcesso[] }>({
    queryKey: qk.opcoesProcesso("situacao", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
    queryFn: () => listarOpcoesProcesso("situacao", { tamanhoPagina: TAMANHO_PAGINA_PICKER }),
  });
  const situacoes = situacoesQuery.data?.opcoes || [];

  const rotuloOpcao = (lista: OpcaoProcesso[], id: string | null | undefined) =>
    lista.find((o) => o.opcao_id === id)?.rotulo || id || "";

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

  function alternarPainel() {
    if (!painelAberto) setRascunho(filtrosAplicados);
    setPainelAberto((v) => !v);
  }

  function aplicarFiltros() {
    setFiltrosAplicados(rascunho);
    setPainelAberto(false);
  }

  function limparFiltros() {
    setRascunho(FILTROS_PROCESSOS_VAZIOS);
    setFiltrosAplicados(FILTROS_PROCESSOS_VAZIOS);
  }

  function removerFiltro(chave: keyof FiltrosEstruturadosProcessos) {
    setFiltrosAplicados((f) => ({ ...f, [chave]: "" }));
    setRascunho((r) => ({ ...r, [chave]: "" }));
  }

  const quantidadeFiltrosAplicados = Object.values(filtrosAplicados).filter(Boolean).length;

  function rotuloFiltro(chave: keyof FiltrosEstruturadosProcessos, valor: string): string {
    if (chave === "clienteId") return clienteNome(valor);
    if (chave === "faseId") return rotuloOpcao(fases, valor);
    if (chave === "situacaoId") return rotuloOpcao(situacoes, valor);
    return formatarData(valor);
  }

  return (
    <>
      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Processos monitorados</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="section-count">
            {carregando ? "carregando…" : filtroAtivo ? `${total} resultado(s)` : `${total} ativo(s)`}
          </span>
          <button className="btn" type="button" onClick={() => setModalAberto(true)}>
            + Novo Processo
          </button>
        </div>
      </div>

      <div className="busca-row">
        <div className="field">
          <span className="field-label-row">
            <label htmlFor="busca-processo">Buscar</label>
            <InfoTip>Busca pelo número do processo, apelido, objeto/assunto, próxima providência ou observações.</InfoTip>
          </span>
          <input
            id="busca-processo"
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Número, apelido, assunto, providência ou observações…"
          />
        </div>
        <button
          className={`btn-ghost${quantidadeFiltrosAplicados > 0 ? " tem-filtro" : ""}`}
          type="button"
          onClick={alternarPainel}
        >
          Filtros{quantidadeFiltrosAplicados > 0 ? ` (${quantidadeFiltrosAplicados})` : ""}
        </button>
      </div>

      <div className={`filtros-painel${painelAberto ? " aberto" : ""}`}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="filtro-cliente">Cliente</label>
            <Select
              id="filtro-cliente"
              opcoes={[{ value: "", label: "Qualquer um" }, ...clientes.map((c) => ({ value: c.cliente_id, label: c.nome }))]}
              valor={rascunho.clienteId}
              onMudar={(v) => setRascunho((r) => ({ ...r, clienteId: v }))}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-fase">Fase atual</label>
            <Select
              id="filtro-fase"
              opcoes={[{ value: "", label: "Qualquer uma" }, ...fases.map((f) => ({ value: f.opcao_id, label: f.rotulo }))]}
              valor={rascunho.faseId}
              onMudar={(v) => setRascunho((r) => ({ ...r, faseId: v }))}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-situacao">Situação atual</label>
            <Select
              id="filtro-situacao"
              opcoes={[{ value: "", label: "Qualquer uma" }, ...situacoes.map((s) => ({ value: s.opcao_id, label: s.rotulo }))]}
              valor={rascunho.situacaoId}
              onMudar={(v) => setRascunho((r) => ({ ...r, situacaoId: v }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="filtro-verificar">Data p/ verificar (até)</label>
            <input
              id="filtro-verificar"
              type="date"
              value={rascunho.dataVerificarAte}
              onChange={(e) => setRascunho((r) => ({ ...r, dataVerificarAte: e.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="filtro-prazo">Prazo final (até)</label>
            <input
              id="filtro-prazo"
              type="date"
              value={rascunho.prazoFinalAte}
              onChange={(e) => setRascunho((r) => ({ ...r, prazoFinalAte: e.target.value }))}
            />
          </div>
        </div>
        <div className="filtros-painel-acoes">
          <button className="btn-ghost" type="button" onClick={limparFiltros}>Limpar</button>
          <button className="btn" type="button" onClick={aplicarFiltros}>Aplicar filtros</button>
        </div>
      </div>

      {quantidadeFiltrosAplicados > 0 && (
        <div className="chips-row">
          {(Object.keys(filtrosAplicados) as (keyof FiltrosEstruturadosProcessos)[])
            .filter((chave) => filtrosAplicados[chave])
            .map((chave) => (
              <span className="chip" key={chave}>
                {LABEL_FILTRO_PROCESSOS[chave]}: {rotuloFiltro(chave, filtrosAplicados[chave])}
                <button type="button" aria-label={`Remover filtro ${LABEL_FILTRO_PROCESSOS[chave]}`} onClick={() => removerFiltro(chave)}>
                  ×
                </button>
              </span>
            ))}
        </div>
      )}

      {carregando ? (
        <Skeleton />
      ) : processos.length === 0 ? (
        <div className="empty">
          {filtroAtivo ? "Nenhum processo encontrado com esses filtros." : "Nenhum processo cadastrado ainda."}
        </div>
      ) : (
        <ul className="docket-list">
          {processos.map((p) => (
            <li
              className="docket"
              key={`${p.subgrupo_id}-${p.numero_processo}`}
              onClick={() => setProcessoEmEdicao(p)}
              style={{ cursor: "pointer" }}
            >
              <div className="docket-main">
                <div className="docket-numero">
                  {mascararNumeroProcesso(p.numero_processo)}
                </div>
                <div className="docket-apelido">
                  {p.apelido || p.numero_processo}
                </div>
                <div className="docket-meta">
                  {subgrupoNome(p.subgrupo_id)}
                  {p.ultima_verificacao
                    ? ` · Última verificação: ${formatarDataHoraAmPm(p.ultima_verificacao)}`
                    : " · Ainda não verificado"}
                </div>
                {(p.fase_id || p.situacao_id || p.data_verificar || p.prazo_final) && (
                  <div className="docket-tags">
                    {p.fase_id && <span className="tag tag-fase">{rotuloOpcao(fases, p.fase_id)}</span>}
                    {p.situacao_id && <span className="tag tag-situacao">{rotuloOpcao(situacoes, p.situacao_id)}</span>}
                    {p.data_verificar && <span className="tag tag-alerta">Verificar {formatarData(p.data_verificar)}</span>}
                    {p.prazo_final && <span className="tag tag-alerta">Prazo {formatarData(p.prazo_final)}</span>}
                  </div>
                )}
              </div>
              <div className="docket-actions">
                <button
                  className="icon-btn"
                  title="Ver histórico"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNumeroAberto(p.numero_processo);
                  }}
                >
                  <IconeHistorico />
                </button>
                <button
                  className="icon-btn"
                  title="Remover"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemover(p);
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!filtroAtivo && !carregando && processos.length > 0 && (
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          tamanhoPagina={tamanhoPagina}
          onMudarPagina={setPagina}
          onMudarTamanho={handleMudarTamanho}
        />
      )}

      {numeroAberto && (
        <Modal
          titulo={mascararNumeroProcesso(numeroAberto)}
          onFechar={() => setNumeroAberto(null)}
        >
          <DetalheProcesso numero={numeroAberto} />
        </Modal>
      )}

      {modalAberto && (
        <Modal titulo="Novo Processo" onFechar={() => setModalAberto(false)}>
          <NovoProcessoForm
            subgrupos={subgrupos}
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
