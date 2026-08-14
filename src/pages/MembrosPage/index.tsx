import { useCallback, useEffect, useState } from "react";
import { listarMembrosDoGrupo, listarSubgrupos, ApiError } from "../../services";
import { Skeleton, useToast } from "../../components";
import { NOME_PAPEL } from "../../constants";
import SubgrupoMembros from "./SubgrupoMembros";
import type { Membro, Subgrupo } from "../../types";

interface MembrosPageProps {
  grupoAlvo: string;
  onAutenticacaoInvalida: () => void;
}

export default function MembrosPage({ grupoAlvo, onAutenticacaoInvalida }: MembrosPageProps) {
  const [pessoas, setPessoas] = useState<Membro[]>([]);
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const toast = useToast();

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [dm, ds] = await Promise.all([
        listarMembrosDoGrupo(grupoAlvo) as Promise<{ membros: Membro[] }>,
        listarSubgrupos(grupoAlvo) as Promise<{ subgrupos: Subgrupo[] }>,
      ]);
      setPessoas(dm.membros || []);
      setSubgrupos(ds.subgrupos || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAutenticacaoInvalida();
      else toast.erro("Não foi possível carregar os membros.");
    } finally {
      setCarregando(false);
    }
  }, [grupoAlvo, onAutenticacaoInvalida, toast]);

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
                <div className="simple-row-title">{p.apelido || p.email}</div>
              </div>
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
          <SubgrupoMembros key={s.subgrupo_id} subgrupo={s} grupoAlvo={grupoAlvo} apelidoPorEmail={apelidoPorEmail} />
        ))}
    </>
  );
}
