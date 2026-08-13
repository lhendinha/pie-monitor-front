import { useCallback, useEffect, useState } from "react";
import { listarProcessos, removerProcesso, listarSubgrupos, ApiError } from "../../services";
import { mascararNumeroProcesso } from "../../utils";
import { Modal, Skeleton } from "../../components";
import DetalheProcesso from "./DetalheProcesso";
import NovoProcessoForm from "./NovoProcessoForm";
import type { Processo, Subgrupo } from "../../types";

interface ProcessosPageProps {
  grupoAlvo: string;
  onAutenticacaoInvalida: () => void;
}

export default function ProcessosPage({ grupoAlvo, onAutenticacaoInvalida }: ProcessosPageProps) {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [numeroAberto, setNumeroAberto] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const subgrupoNome = (id: string) => subgrupos.find((s) => s.subgrupo_id === id)?.nome || id;

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [dp, ds] = await Promise.all([
        listarProcessos(grupoAlvo) as Promise<{ processos: Processo[] }>,
        listarSubgrupos(grupoAlvo) as Promise<{ subgrupos: Subgrupo[] }>,
      ]);
      setProcessos(dp.processos || []);
      setSubgrupos(ds.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else setErro("Não foi possível carregar os processos.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleRemover(p: Processo) {
    if (!window.confirm(`Remover ${mascararNumeroProcesso(p.numero_processo)} desse subgrupo?`)) return;
    try {
      await removerProcesso(p.subgrupo_id, p.numero_processo, grupoAlvo);
      setProcessos((prev) =>
        prev.filter((x) => !(x.subgrupo_id === p.subgrupo_id && x.numero_processo === p.numero_processo))
      );
    } catch {
      setErro("Não foi possível remover esse processo.");
    }
  }

  return (
    <>
      <div className="section-head" style={{ marginTop: 28 }}>
        <h2>Processos monitorados</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="section-count">{carregando ? "carregando…" : `${processos.length} ativo(s)`}</span>
          <button className="btn" type="button" onClick={() => setModalAberto(true)}>
            + Novo Processo
          </button>
        </div>
      </div>

      {erro && <div className="banner">{erro}</div>}

      {carregando ? (
        <Skeleton />
      ) : processos.length === 0 ? (
        <div className="empty">Nenhum processo cadastrado ainda.</div>
      ) : (
        <ul className="docket-list">
          {processos.map((p) => (
            <li className="docket" key={`${p.subgrupo_id}-${p.numero_processo}`}>
              <button className="docket-main docket-main-clickable" onClick={() => setNumeroAberto(p.numero_processo)}>
                <div className="docket-numero">{mascararNumeroProcesso(p.numero_processo)}</div>
                <div className="docket-apelido">{p.apelido || p.numero_processo}</div>
                <div className="docket-meta">
                  {subgrupoNome(p.subgrupo_id)}
                  {p.ultima_verificacao ? ` · última verificação: ${p.ultima_verificacao}` : " · ainda não verificado"}
                </div>
              </button>
              <div className="docket-actions">
                <button className="icon-btn" title="Remover" onClick={() => handleRemover(p)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {numeroAberto && (
        <DetalheProcesso numero={numeroAberto} grupoAlvo={grupoAlvo} onFechar={() => setNumeroAberto(null)} />
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
