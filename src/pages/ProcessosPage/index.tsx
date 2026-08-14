import { useCallback, useEffect, useState } from "react";
import {
  listarProcessos,
  removerProcesso,
  listarSubgrupos,
  ApiError,
} from "../../services";
import { mascararNumeroProcesso, apenasDigitos } from "../../utils";
import { Modal, Skeleton, Pagination, useToast } from "../../components";
import DetalheProcesso from "./DetalheProcesso";
import NovoProcessoForm from "./NovoProcessoForm";
import type { Processo, Subgrupo } from "../../types";

interface ProcessosPageProps {
  grupoAlvo: string;
  onAutenticacaoInvalida: () => void;
}

const TAMANHO_PADRAO = 10;

export default function ProcessosPage({
  grupoAlvo,
  onAutenticacaoInvalida,
}: ProcessosPageProps) {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [numeroAberto, setNumeroAberto] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PADRAO);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  const [buscaInput, setBuscaInput] = useState("");
  const [busca, setBusca] = useState("");
  const buscaDigitos = apenasDigitos(buscaInput);

  const toast = useToast();

  const subgrupoNome = (id: string) =>
    subgrupos.find((s) => s.subgrupo_id === id)?.nome || id;

  // Debounce -- só dispara a busca depois de parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaDigitos), 350);
    return () => clearTimeout(t);
  }, [buscaDigitos]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [dp, ds] = await Promise.all([
        listarProcessos(
          busca ? { busca } : { pagina, tamanhoPagina },
          grupoAlvo,
        ) as Promise<{
          processos: Processo[];
          total: number;
          total_paginas: number;
        }>,
        listarSubgrupos(grupoAlvo) as Promise<{ subgrupos: Subgrupo[] }>,
      ]);
      setProcessos(dp.processos || []);
      setTotal(dp.total ?? 0);
      setTotalPaginas(dp.total_paginas ?? 0);
      setSubgrupos(ds.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401)
        onAutenticacaoInvalida();
      else toast.erro("Não foi possível carregar os processos.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida, pagina, tamanhoPagina, busca, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  async function handleRemover(p: Processo) {
    if (
      !window.confirm(
        `Remover ${mascararNumeroProcesso(p.numero_processo)} desse subgrupo?`,
      )
    )
      return;
    try {
      await removerProcesso(p.subgrupo_id, p.numero_processo, grupoAlvo);
      carregar();
    } catch {
      toast.erro("Não foi possível remover esse processo.");
    }
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
              <button
                className="docket-main docket-main-clickable"
                onClick={() => setNumeroAberto(p.numero_processo)}
              >
                <div className="docket-numero">
                  {mascararNumeroProcesso(p.numero_processo)}
                </div>
                <div className="docket-apelido">
                  {p.apelido || p.numero_processo}
                </div>
                <div className="docket-meta">
                  {subgrupoNome(p.subgrupo_id)}
                  {p.ultima_verificacao
                    ? ` · Última verificação: ${p.ultima_verificacao}`
                    : " · Ainda não verificado"}
                </div>
              </button>
              <div className="docket-actions">
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
        <DetalheProcesso
          numero={numeroAberto}
          grupoAlvo={grupoAlvo}
          onFechar={() => setNumeroAberto(null)}
        />
      )}

      {modalAberto && (
        <Modal titulo="Novo Processo" onFechar={() => setModalAberto(false)}>
          <NovoProcessoForm
            subgrupos={subgrupos}
            grupoAlvo={grupoAlvo}
            onCadastrado={carregar}
            onFechar={() => setModalAberto(false)}
          />
        </Modal>
      )}
    </>
  );
}
