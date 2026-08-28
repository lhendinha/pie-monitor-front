import { useState } from "react";

import { useEstadoNaUrl } from "../../hooks/useEstadoNaUrl";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AreaAtualizando,
  CartaoDeTabela,
  EstadoDeErro,
  Pagination,
  Esqueleto,
} from "../../components";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { listarClientes, papelAtende } from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import CabecalhoClientes from "./components/CabecalhoClientes";
import NovoClienteForm from "./components/NovoClienteForm";
import TabelaClientes from "./components/TabelaClientes";
import type {
  RespostaDeClientesPaginada,
} from "../../types/respostas";

/** Listagem de clientes.
 *
 * O detalhe é rota (`/clientes/:id`), como em Processos: a tela precisa
 * sobreviver a um F5 e a um link colado, e o `GET /clientes/{id}` existe
 * justamente pra isso.
 */
export default function ClientesPage() {
  const [pagina, setPagina] = useEstadoNaUrl("pagina", 1);
  const [tamanhoPagina, setTamanhoPagina] = useEstadoNaUrl("tamanho", TAMANHO_PAGINA_PADRAO, { tambemApaga: ["pagina"] });
  const [modalAberto, setModalAberto] = useState(false);
  const [buscaInput, setBuscaInput] = useEstadoNaUrl("busca", "", { tambemApaga: ["pagina"] });
  /** ⚠️ Debounce de verdade, não `useDeferredValue`. Aquele não tem
   * componente de TEMPO: só pula valores intermediários quando o render é
   * lento o bastante, e nesta tabela ele é rápido -- então cada tecla virava
   * uma `queryKey` nova e uma requisição. Digitar "silva" eram cinco. */
  const busca = useValorComEspera(buscaInput);
  const queryClient = useQueryClient();

  const podeCriar = papelAtende("manager");

  // Buscando, a API devolve o conjunto filtrado inteiro num envelope só --
  // por isso a paginação some enquanto há termo.
  const parametros = busca ? { busca } : { pagina, tamanhoPagina };
  const query = useQuery<RespostaDeClientesPaginada>({
    queryKey: qk.clientes(parametros),
    /* Mantém a página anterior na tela enquanto a nova vem. Sem isto a
       `queryKey` muda, a chave nasce fria, `isPending` vira `true` e a
       tabela DESMONTA -- pisca a cada página, a cada filtro e a cada tecla
       da busca. O `AreaAtualizando` em volta é que diz que o conteúdo
       visível ainda é o antigo. */
    placeholderData: keepPreviousData,
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
        exibidos={clientes.length}
        busca={buscaInput}
        /* Duas fases, e as duas são "o que você vê não é o que você
           escreveu": a espera entre teclas (o input já mudou, `busca` não) e
           a consulta em voo (`isPlaceholderData`). */
        buscando={buscaInput !== busca || query.isPlaceholderData}
        onBuscar={setBuscaInput}
        podeCriar={podeCriar}
        onNovoCliente={() => setModalAberto(true)}
      />

      {carregando ? (
        <Esqueleto />
      ) : query.isError ? (
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar os clientes."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <CartaoDeTabela>
          <AreaAtualizando atualizando={query.isPlaceholderData}>
            <TabelaClientes
              clientes={clientes}
              busca={busca}
              onLimparBusca={() => setBuscaInput("")}
            />
          </AreaAtualizando>
          {!busca && clientes.length > 0 && (
            <Pagination
              pagina={pagina}
              totalPaginas={totalPaginas}
              total={total}
              tamanhoPagina={tamanhoPagina}
              onMudarPagina={setPagina}
              onMudarTamanho={setTamanhoPagina}
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
