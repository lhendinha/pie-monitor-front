import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listarSubgrupos, criarSubgrupo, removerSubgrupo, papelAtende, ApiError } from "../../services";
import { Skeleton, useToast } from "../../components";
import type { Subgrupo } from "../../types";

interface PageProps {
  grupoAlvo: string;
  onAutenticacaoInvalida: () => void;
}

export default function SubgruposPage({ grupoAlvo, onAutenticacaoInvalida }: PageProps) {
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  const podeCriar = papelAtende("manager");
  const podeExcluir = papelAtende("admin");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const d = (await listarSubgrupos(grupoAlvo)) as { subgrupos: Subgrupo[] };
      setSubgrupos(d.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else toast.erro("Não foi possível carregar os subgrupos.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleCriar(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    setEnviando(true);
    try {
      await criarSubgrupo(nome.trim(), grupoAlvo);
      setNome("");
      await carregar();
    } catch (err) {
      setCampoInvalido(true);
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível criar.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(id: string) {
    if (!window.confirm("Remover esse subgrupo? Só funciona se estiver vazio (0 membros).")) return;
    try {
      await removerSubgrupo(id, grupoAlvo);
      setSubgrupos((prev) => prev.filter((s) => s.subgrupo_id !== id));
    } catch (err) {
      toast.erro(err instanceof ApiError ? err.message : "Não foi possível remover.");
    }
  }

  return (
    <>
      {podeCriar && (
        <form onSubmit={handleCriar}>
          <div className="form-row">
            <div className={`field${campoInvalido ? " field-error" : ""}`} style={{ flex: 2 }}>
              <label htmlFor="nome-subgrupo">Novo subgrupo</label>
              <input
                id="nome-subgrupo"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setCampoInvalido(false);
                }}
                placeholder="Cível, Trabalhista..."
              />
            </div>
            <button className="btn" type="submit" disabled={enviando || !nome.trim()}>
              {enviando ? "Criando…" : "Criar"}
            </button>
          </div>
        </form>
      )}

      <div className="section-head">
        <h2>Subgrupos</h2>
        <span className="section-count">{carregando ? "carregando…" : `${subgrupos.length}`}</span>
      </div>

      {carregando ? (
        <Skeleton linhas={2} />
      ) : subgrupos.length === 0 ? (
        <div className="empty">Nenhum subgrupo ainda.</div>
      ) : (
        <ul className="simple-list">
          {subgrupos.map((s) => (
            <li className="simple-row" key={s.subgrupo_id}>
              <div className="simple-row-main">
                <div className="simple-row-title">{s.nome}</div>
              </div>
              {podeExcluir && (
                <button className="icon-btn" title="Remover" onClick={() => handleRemover(s.subgrupo_id)}>
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
