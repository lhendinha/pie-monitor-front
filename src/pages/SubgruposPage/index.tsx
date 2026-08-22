import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarSubgrupos, criarSubgrupo, removerSubgrupo, papelAtende } from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Esqueleto, Pagination, Modal, useToast } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import EditarSubgrupoForm from "./EditarSubgrupoForm";
import type { Subgrupo } from "../../types";

export default function SubgruposPage() {
  const [nome, setNome] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [subgrupoEmEdicao, setSubgrupoEmEdicao] = useState<Subgrupo | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const podeCriar = papelAtende("manager");
  const podeEditar = papelAtende("admin");
  const podeExcluir = papelAtende("admin");

  const query = useQuery<{ subgrupos: Subgrupo[]; total: number; total_paginas: number }>({
    queryKey: qk.subgrupos({ pagina, tamanhoPagina }),
    queryFn: () => listarSubgrupos({ pagina, tamanhoPagina }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os subgrupos.");
  const subgrupos = query.data?.subgrupos || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  function invalidarSubgrupos() {
    queryClient.invalidateQueries({ queryKey: qk.subgrupos() });
  }

  const criarMutation = useMutation({
    mutationFn: (nomeNovo: string) => criarSubgrupo(nomeNovo),
    onSuccess: () => {
      setNome("");
      invalidarSubgrupos();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível criar.");
    },
  });

  const removerMutation = useMutation({
    mutationFn: (id: string) => removerSubgrupo(id),
    onSuccess: invalidarSubgrupos,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover."),
  });

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    criarMutation.mutate(nome.trim());
  }

  function handleRemover(id: string) {
    if (!window.confirm("Remover esse subgrupo? Só funciona se estiver vazio (0 membros).")) return;
    removerMutation.mutate(id);
  }

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
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
            <button className="btn" type="submit" disabled={criarMutation.isPending || !nome.trim()}>
              {criarMutation.isPending ? "Criando…" : "Criar"}
            </button>
          </div>
        </form>
      )}

      <div className="section-head">
        <h2>Subgrupos</h2>
        <span className="section-count">{query.isPending ? "carregando…" : `${total}`}</span>
      </div>

      {query.isPending ? (
        <Esqueleto linhas={2} />
      ) : subgrupos.length === 0 ? (
        <div className="empty">Nenhum subgrupo ainda.</div>
      ) : (
        <>
          <ul className="simple-list">
            {subgrupos.map((s) => (
              <li className="simple-row" key={s.subgrupo_id}>
                <div className="simple-row-main">
                  <div className="simple-row-title">{s.nome}</div>
                </div>
                {podeEditar && (
                  <button className="icon-btn" title="Editar" onClick={() => setSubgrupoEmEdicao(s)}>
                    ✎
                  </button>
                )}
                {podeExcluir && (
                  <button className="icon-btn" title="Remover" onClick={() => handleRemover(s.subgrupo_id)}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
          total={total}
            tamanhoPagina={tamanhoPagina}
            onMudarPagina={setPagina}
            onMudarTamanho={handleMudarTamanho}
          />
        </>
      )}

      {subgrupoEmEdicao && (
        <Modal titulo="Editar subgrupo" onFechar={() => setSubgrupoEmEdicao(null)}>
          <EditarSubgrupoForm
            subgrupo={subgrupoEmEdicao}
            onAtualizado={invalidarSubgrupos}
            onFechar={() => setSubgrupoEmEdicao(null)}
          />
        </Modal>
      )}
    </>
  );
}
