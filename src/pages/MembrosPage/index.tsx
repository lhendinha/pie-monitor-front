import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listarMembrosDoGrupo, listarSubgrupos, listarGrupos, ehSuperAdmin } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Modal, Esqueleto } from "../../components";
import { NOME_PAPEL } from "../../constants";
import SubgrupoMembros from "./SubgrupoMembros";
import EditarMembroForm from "./EditarMembroForm";
import type { Membro, Subgrupo, Grupo } from "../../types";

export default function MembrosPage() {
  const [membroEmEdicao, setMembroEmEdicao] = useState<Membro | null>(null);
  const queryClient = useQueryClient();

  const membrosQuery = useQuery<{ membros: Membro[] }>({
    queryKey: qk.membros(),
    queryFn: listarMembrosDoGrupo,
  });
  useToastOnQueryError(membrosQuery.error, "Não foi possível carregar os membros.");

  const subgruposQuery = useQuery<{ subgrupos: Subgrupo[] }>({
    // Precisa da lista inteira pra renderizar 1 <SubgrupoMembros> por
    // subgrupo, não de 1 página.
    queryKey: qk.subgrupos({ tamanhoPagina: 100 }),
    queryFn: () => listarSubgrupos({ tamanhoPagina: 100 }),
  });
  useToastOnQueryError(subgruposQuery.error, "Não foi possível carregar os subgrupos.");

  const gruposQuery = useQuery<{ grupos: Grupo[] }>({
    queryKey: qk.grupos(),
    queryFn: listarGrupos,
    enabled: ehSuperAdmin(),
  });
  useToastOnQueryError(gruposQuery.error, "Não foi possível carregar os grupos.");

  const pessoas = membrosQuery.data?.membros || [];
  const subgrupos = subgruposQuery.data?.subgrupos || [];
  const grupos = gruposQuery.data?.grupos || [];
  const carregando = membrosQuery.isPending;

  // Mesmo escopo do `carregar()` de antes (Promise.all de membros +
  // subgrupos + grupos) -- passado pro EditarMembroForm como `onAtualizado`.
  function recarregarTudo() {
    queryClient.invalidateQueries({ queryKey: qk.membros() });
    queryClient.invalidateQueries({ queryKey: qk.subgrupos() });
    if (ehSuperAdmin()) queryClient.invalidateQueries({ queryKey: qk.grupos() });
  }

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
        <Esqueleto linhas={2} />
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

      {!subgruposQuery.isPending &&
        subgrupos.map((s) => (
          <SubgrupoMembros key={s.subgrupo_id} subgrupo={s} apelidoPorEmail={apelidoPorEmail} />
        ))}

      {membroEmEdicao && (
        <Modal titulo="Editar pessoa" onFechar={() => setMembroEmEdicao(null)}>
          <EditarMembroForm
            membro={membroEmEdicao}
            grupos={grupos}
            onAtualizado={recarregarTudo}
            onFechar={() => setMembroEmEdicao(null)}
          />
        </Modal>
      )}
    </>
  );
}
