import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarProcessos, removerProcesso, listarSubgrupos } from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { mascararNumeroProcesso, apenasDigitos, formatarDataHoraAmPm } from "../../utils";
import { Modal, Skeleton, Pagination, IconeHistorico, useToast } from "../../components";
import { TAMANHO_PAGINA_PADRAO, INTERVALO_POLLING_PROCESSOS_MS } from "../../constants";
import DetalheProcesso from "./DetalheProcesso";
import NovoProcessoForm from "./NovoProcessoForm";
import EditarApelidoForm from "./EditarApelidoForm";
import type { Processo, Subgrupo } from "../../types";

export default function ProcessosPage() {
  // O link do e-mail de notificação agora leva pra aba Histórico (ver
  // HistoricoPage/index.tsx + App.tsx) -- aqui só abre por clique mesmo.
  const [numeroAberto, setNumeroAberto] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [processoEmEdicao, setProcessoEmEdicao] = useState<Processo | null>(null);

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);

  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const buscaDigitos = apenasDigitos(buscaInput);

  const toast = useToast();
  const queryClient = useQueryClient();

  // Debounce -- só dispara a busca depois de parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaDigitos), 350);
    return () => clearTimeout(t);
  }, [buscaDigitos]);

  const parametrosBusca = busca ? { busca } : { pagina, tamanhoPagina };

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
    queryKey: qk.subgrupos(),
    queryFn: listarSubgrupos,
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = subgruposQuery.data?.subgrupos || [];

  const subgrupoNome = (id: string) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id;

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
    if (
      !window.confirm(
        `Remover ${mascararNumeroProcesso(p.numero_processo)} desse subgrupo?`,
      )
    )
      return;
    removerMutation.mutate(p);
  }

  function invalidarProcessos() {
    queryClient.invalidateQueries({ queryKey: ["processos"] });
  }

  return (
    <>
      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Processos monitorados</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="section-count">
            {carregando
              ? "carregando…"
              : busca
                ? `${processos.length} resultado(s)`
                : `${total} ativo(s)`}
          </span>
          <button
            className="btn"
            type="button"
            onClick={() => setModalAberto(true)}
          >
            + Novo Processo
          </button>
        </div>
      </div>

      <div className="field" style={{ marginTop: 16, maxWidth: 320 }}>
        <label htmlFor="busca-processo">Buscar por número</label>
        <input
          id="busca-processo"
          value={buscaInput}
          onChange={(e) =>
            setBuscaInput(mascararNumeroProcesso(e.target.value))
          }
          placeholder="digite parte do número"
          inputMode="numeric"
        />
      </div>

      {carregando ? (
        <Skeleton />
      ) : processos.length === 0 ? (
        <div className="empty">
          {busca
            ? `Nenhum processo encontrado pra "${mascararNumeroProcesso(busca)}".`
            : "Nenhum processo cadastrado ainda."}
        </div>
      ) : (
        <ul className="docket-list">
          {processos.map((p) => (
            <li
              className="docket"
              key={`${p.subgrupo_id}-${p.numero_processo}`}
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
              </div>
              <div className="docket-actions">
                <button
                  className="icon-btn"
                  title="Ver histórico"
                  onClick={() => setNumeroAberto(p.numero_processo)}
                >
                  <IconeHistorico />
                </button>
                <button
                  className="icon-btn"
                  title="Editar apelido"
                  onClick={() => setProcessoEmEdicao(p)}
                >
                  ✎
                </button>
                <button
                  className="icon-btn"
                  title="Remover"
                  onClick={() => handleRemover(p)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!busca && !carregando && processos.length > 0 && (
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
        <Modal titulo="Editar apelido" onFechar={() => setProcessoEmEdicao(null)}>
          <EditarApelidoForm
            processo={processoEmEdicao}
            onAtualizado={invalidarProcessos}
            onFechar={() => setProcessoEmEdicao(null)}
          />
        </Modal>
      )}
    </>
  );
}
