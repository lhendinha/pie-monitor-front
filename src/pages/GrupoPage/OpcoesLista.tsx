import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarOpcoesProcesso,
  criarOpcaoProcesso,
  desativarOpcaoProcesso,
  reativarOpcaoProcesso,
} from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Skeleton, Pagination, Modal, useToast } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import EditarOpcaoForm from "./EditarOpcaoForm";
import type { OpcaoProcesso, TipoOpcaoProcesso } from "../../types";

interface OpcoesListaProps {
  tipo: TipoOpcaoProcesso;
  titulo: string;
}

/** CRUD de 1 lista (fase OU situação) -- ao contrário do dropdown do
 * processo (que só mostra ativas), essa tela lista TODAS as opções,
 * incluindo inativas, com ação de reativar (soft-delete via `ativo`). */
export default function OpcoesLista({ tipo, titulo }: OpcoesListaProps) {
  const [rotulo, setRotulo] = useState("");
  const [campoInvalido, setCampoInvalido] = useState(false);
  const [opcaoEmEdicao, setOpcaoEmEdicao] = useState<OpcaoProcesso | null>(null);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const toast = useToast();
  const queryClient = useQueryClient();

  const query = useQuery<{ opcoes: OpcaoProcesso[]; total: number; total_paginas: number }>({
    queryKey: qk.opcoesProcesso(tipo, { pagina, tamanhoPagina }),
    queryFn: () => listarOpcoesProcesso(tipo, { pagina, tamanhoPagina }),
  });
  useToastOnQueryError(query.error, `Não foi possível carregar ${titulo.toLowerCase()}.`);
  const opcoes = [...(query.data?.opcoes || [])].sort((a, b) => a.ordem - b.ordem);
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: qk.opcoesProcesso(tipo) });
  }

  const criarMutation = useMutation({
    // `total` (contagem real, vinda do envelope de paginação), não
    // `opcoes.length` -- esse é só o tamanho da página atual, usar ele
    // aqui daria uma `ordem` errada a partir da 2ª página em diante.
    mutationFn: () => criarOpcaoProcesso(tipo, rotulo.trim(), total + 1),
    onSuccess: () => {
      setRotulo("");
      invalidar();
    },
    onError: (err) => {
      setCampoInvalido(true);
      toastErroMutation(toast, err, "Não foi possível criar.");
    },
  });

  const desativarMutation = useMutation({
    mutationFn: (id: string) => desativarOpcaoProcesso(tipo, id),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível desativar."),
  });

  const reativarMutation = useMutation({
    mutationFn: (id: string) => reativarOpcaoProcesso(tipo, id),
    onSuccess: invalidar,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível reativar."),
  });

  function handleCriar(e: FormEvent) {
    e.preventDefault();
    setCampoInvalido(false);
    criarMutation.mutate();
  }

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  return (
    <div>
      <form onSubmit={handleCriar}>
        <div className="form-row">
          <div className={`field${campoInvalido ? " field-error" : ""}`} style={{ flex: 2 }}>
            <label htmlFor={`novo-rotulo-${tipo}`}>Nova opção</label>
            <input
              id={`novo-rotulo-${tipo}`}
              value={rotulo}
              onChange={(e) => {
                setRotulo(e.target.value);
                setCampoInvalido(false);
              }}
            />
          </div>
          <button className="btn" type="submit" disabled={criarMutation.isPending || !rotulo.trim()}>
            {criarMutation.isPending ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>

      <div className="section-head" style={{ marginTop: 16 }}>
        <h2>{titulo}</h2>
        <span className="section-count">{query.isPending ? "carregando…" : `${total}`}</span>
      </div>

      {query.isPending ? (
        <Skeleton linhas={2} />
      ) : opcoes.length === 0 ? (
        <div className="empty">Nenhuma opção ainda.</div>
      ) : (
        <>
          <ul className="simple-list">
            {opcoes.map((o) => (
              <li className="simple-row" key={o.opcao_id}>
                <div className="simple-row-main">
                  <div className="simple-row-title">
                    {o.rotulo}
                    {!o.ativo && <span className="muted"> (Inativa)</span>}
                  </div>
                </div>
                <button className="icon-btn" title="Editar" onClick={() => setOpcaoEmEdicao(o)}>
                  ✎
                </button>
                {o.ativo ? (
                  <button
                    className="icon-btn"
                    title="Desativar"
                    onClick={() => desativarMutation.mutate(o.opcao_id)}
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    className="icon-btn"
                    title="Reativar"
                    onClick={() => reativarMutation.mutate(o.opcao_id)}
                  >
                    ↺
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            tamanhoPagina={tamanhoPagina}
            onMudarPagina={setPagina}
            onMudarTamanho={handleMudarTamanho}
          />
        </>
      )}

      {opcaoEmEdicao && (
        <Modal titulo="Editar opção" onFechar={() => setOpcaoEmEdicao(null)}>
          <EditarOpcaoForm
            tipo={tipo}
            opcao={opcaoEmEdicao}
            onAtualizado={invalidar}
            onFechar={() => setOpcaoEmEdicao(null)}
          />
        </Modal>
      )}
    </div>
  );
}
