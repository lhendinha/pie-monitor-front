import { useDeferredValue, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CartaoDeTabela, Pagination, Skeleton } from "../../components";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { listarClientes, papelAtende } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import CabecalhoClientes from "./components/CabecalhoClientes";
import NovoClienteForm from "./components/NovoClienteForm";
import TabelaClientes from "./components/TabelaClientes";
import type { Cliente } from "../../types";

/** Listagem de clientes.
 *
 * O detalhe é rota (`/clientes/:id`), como em Processos: a tela precisa
 * sobreviver a um F5 e a um link colado, e o `GET /clientes/{id}` existe
 * justamente pra isso.
 */
export default function ClientesPage() {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [modalAberto, setModalAberto] = useState(false);
  const [buscaInput, setBuscaInput] = useState("");
  // `useDeferredValue` em vez de debounce: o React adia o valor derivado
  // enquanto a digitação está rápida, sem timer pra limpar.
  const busca = useDeferredValue(buscaInput);
  const queryClient = useQueryClient();

  const podeCriar = papelAtende("manager");

  // Buscando, a API devolve o conjunto filtrado inteiro num envelope só --
  // por isso a paginação some enquanto há termo.
  const parametros = busca ? { busca } : { pagina, tamanhoPagina };
  const query = useQuery<{ clientes: Cliente[]; total: number; total_paginas: number }>({
    queryKey: qk.clientes(parametros),
    queryFn: () => listarClientes(parametros),
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os clientes.");

  const clientes = query.data?.clientes || [];
  const total = query.data?.total ?? 0;
  const totalPaginas = query.data?.total_paginas ?? 0;
  const carregando = query.isPending;

  return (
    <>
      <CabecalhoClientes
        carregando={carregando}
        total={total}
        busca={buscaInput}
        onBuscar={setBuscaInput}
        podeCriar={podeCriar}
        onNovoCliente={() => setModalAberto(true)}
      />

      {carregando ? (
        <Skeleton />
      ) : (
        <CartaoDeTabela>
          <TabelaClientes
            clientes={clientes}
            busca={busca}
            onLimparBusca={() => setBuscaInput("")}
          />
          {!busca && clientes.length > 0 && (
            <Pagination
              pagina={pagina}
              totalPaginas={totalPaginas}
              total={total}
              tamanhoPagina={tamanhoPagina}
              onMudarPagina={setPagina}
              onMudarTamanho={(t) => {
                setTamanhoPagina(t);
                setPagina(1);
              }}
            />
          )}
        </CartaoDeTabela>
      )}

      {modalAberto && (
        <NovoClienteForm
          onCadastrado={() => queryClient.invalidateQueries({ queryKey: ["clientes"] })}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </>
  );
}
