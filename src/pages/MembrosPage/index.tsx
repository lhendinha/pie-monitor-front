import { useCallback, useEffect, useState } from "react";
import { listarMembrosDoGrupo, listarSubgrupos, listarGrupos, ehSuperAdmin, ApiError } from "../../services";
import { Modal, Skeleton, useToast } from "../../components";
import { NOME_PAPEL } from "../../constants";
import SubgrupoMembros from "./SubgrupoMembros";
import EditarMembroForm from "./EditarMembroForm";
import type { Membro, Subgrupo, Grupo } from "../../types";

interface MembrosPageProps {
  onAutenticacaoInvalida: () => void;
}

export default function MembrosPage({ onAutenticacaoInvalida }: MembrosPageProps) {
  const [pessoas, setPessoas] = useState<Membro[]>([]);
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [membroEmEdicao, setMembroEmEdicao] = useState<Membro | null>(null);
  const toast = useToast();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [dm, ds, dg] = await Promise.all([
        listarMembrosDoGrupo() as Promise<{ membros: Membro[] }>,
        listarSubgrupos() as Promise<{ subgrupos: Subgrupo[] }>,
        (ehSuperAdmin() ? listarGrupos() : Promise.resolve({ grupos: [] })) as Promise<{ grupos: Grupo[] }>,
      ]);
      setPessoas(dm.membros || []);
      setSubgrupos(ds.subgrupos || []);
      setGrupos(dg.grupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else toast.erro("Não foi possível carregar os membros.");
    } finally {
      setCarregando(false);
    }
  }, [onAutenticacaoInvalida, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Lista de membros por subgrupo só devolve e-mail (sem apelido) -- monta um
  // mapa a partir da lista completa do grupo (que já tem os dois) em vez de
  // pedir um join novo no backend.
  const apelidoPorEmail = new Map(pessoas.map((p) => [p.email, p.apelido]));

  return (
    <>
      <div className="section-head">
        <h2>Pessoas do grupo</h2>
        <span className="section-count">{carregando ? "carregando…" : `${pessoas.length}`}</span>
      </div>

      {carregando ? (
        <Skeleton linhas={2} />
      ) : (
        <ul className="simple-list">
          {pessoas.map((p) => (
            <li className="simple-row" key={p.email}>
              <div className="simple-row-main">
                <div className="simple-row-title">{p.email}</div>
                {p.apelido && <div className="simple-row-meta">{p.apelido}</div>}
              </div>
              {ehSuperAdmin() && (
                <button className="icon-btn" title="Editar" onClick={() => setMembroEmEdicao(p)}>
                  ✎
                </button>
              )}
              <span className={`role-badge role-${p.papel}`}>{(p.papel && NOME_PAPEL[p.papel]) || p.papel}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="section-head">
        <h2>Membros por subgrupo</h2>
      </div>

      {!carregando &&
        subgrupos.map((s) => (
          <SubgrupoMembros key={s.subgrupo_id} subgrupo={s} apelidoPorEmail={apelidoPorEmail} />
        ))}

      {membroEmEdicao && (
        <Modal titulo="Editar pessoa" onFechar={() => setMembroEmEdicao(null)}>
          <EditarMembroForm
            membro={membroEmEdicao}
            grupos={grupos}
            onAtualizado={carregar}
            onFechar={() => setMembroEmEdicao(null)}
          />
        </Modal>
      )}
    </>
  );
}
