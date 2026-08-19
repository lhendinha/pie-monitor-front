import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listarClientes, removerCliente, papelAtende } from "../../services";
import { useToastOnQueryError, toastErroMutation } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import { Skeleton, Pagination, Modal, useToast } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import NovoClienteForm from "./NovoClienteForm";
import EditarClienteForm from "./EditarClienteForm";
import type { Cliente } from "../../types";

export default function ClientesPage() {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Cliente | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const podeCriar = papelAtende("manager");
  const podeExcluir = papelAtende("admin");

  const query = useQuery<{ clientes: Cliente[]; total: number; total_paginas: number }>({
    queryKey: qk.clientes({ pagina, tamanhoPagina }),
    queryFn: () => listarClientes({ pagina, tamanhoPagina }),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os clientes.");
  const clientes = query.data?.clientes || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;

  function invalidarClientes() {
    queryClient.invalidateQueries({ queryKey: qk.clientes() });
  }

  const removerMutation = useMutation({
    mutationFn: (id: string) => removerCliente(id),
    onSuccess: invalidarClientes,
    onError: (err) => toastErroMutation(toast, err, "Não foi possível remover."),
  });

  function handleRemover(id: string, nomeCliente: string) {
    if (!window.confirm(`Remover o cliente "${nomeCliente}"?`)) return;
    removerMutation.mutate(id);
  }

  function handleMudarTamanho(novoTamanho: number) {
    setTamanhoPagina(novoTamanho);
    setPagina(1);
  }

  return (
    <>
      <div className="section-head">
        <h2>Clientes</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="section-count">{query.isPending ? "carregando…" : `${total}`}</span>
          {podeCriar && (
            <button className="btn" type="button" onClick={() => setModalAberto(true)}>
              + Novo Cliente
            </button>
          )}
        </div>
      </div>

      {query.isPending ? (
        <Skeleton linhas={2} />
      ) : clientes.length === 0 ? (
        <div className="empty">Nenhum cliente ainda.</div>
      ) : (
        <>
          <ul className="simple-list">
            {clientes.map((c) => (
              <li className="simple-row" key={c.cliente_id}>
                <div className="simple-row-main">
                  <div className="simple-row-title">{c.nome}</div>
                </div>
                {podeCriar && (
                  <button className="icon-btn" title="Editar" onClick={() => setClienteEmEdicao(c)}>
                    ✎
                  </button>
                )}
                {podeExcluir && (
                  <button className="icon-btn" title="Remover" onClick={() => handleRemover(c.cliente_id, c.nome)}>
                    ✕
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

      {modalAberto && (
        <Modal titulo="Novo Cliente" onFechar={() => setModalAberto(false)}>
          <NovoClienteForm onCadastrado={invalidarClientes} onFechar={() => setModalAberto(false)} />
        </Modal>
      )}

      {clienteEmEdicao && (
        <Modal titulo="Editar cliente" onFechar={() => setClienteEmEdicao(null)}>
          <EditarClienteForm
            cliente={clienteEmEdicao}
            onAtualizado={invalidarClientes}
            onFechar={() => setClienteEmEdicao(null)}
          />
        </Modal>
      )}
    </>
  );
}
