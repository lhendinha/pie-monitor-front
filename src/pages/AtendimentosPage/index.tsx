import { Box } from "@chakra-ui/react";
import { useState } from "react";

import { useEstadoNaUrl } from "../../hooks/useEstadoNaUrl";
import { usePaginacaoDaLista } from "../../hooks/usePaginacaoDaLista";
import { useParametrosDaUrl } from "../../hooks/useParametrosDaUrl";
import { useLocation, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AreaAtualizando,
  Botao,
  CartaoDeTabela,
  EstadoDeErro,
  EstadoVazio,
  Esqueleto,
  Pagination,
} from "../../components";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import {
  listarAtendimentos,
} from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import CabecalhoAtendimentos from "./components/CabecalhoAtendimentos";
import LinhaDeAtendimento from "./components/LinhaDeAtendimento";
import NovoAtendimentoForm from "./components/NovoAtendimentoForm";
import { STATUS_TODOS, statusParaApi } from "./constants";
import { useSubgruposBuscaveis } from "../../hooks/useOpcoesBuscaveis";
import type {
  RespostaDeAtendimentosPaginada,
} from "../../types/respostas";

/** Listagem de atendimentos.
 *
 * O detalhe é ROTA (`/atendimentos/:subgrupoId/:id`), e não uma troca de
 * `display` como no artifact: a tela precisa sobreviver a um F5 e a um link
 * colado, e `GET /subgrupos/{id}/atendimentos/{id}` existe justamente pra
 * isso. Mesmo caminho de Clientes e Processos.
 *
 * O par (subgrupo, id) vai na URL porque é a chave primária -- o
 * atendimento não é endereçável só pelo id.
 */
export default function AtendimentosPage() {
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } = usePaginacaoDaLista();
  const [buscaInput, setBuscaInput] = useEstadoNaUrl("busca", "", { tambemApaga: ["pagina"] });
  /** A Área de trabalho abre esta tela já filtrada: clicar em "Atendimentos
   * em andamento" tem que mostrar exatamente os que geraram aquele número.
   *
   * Por `state` da navegação e não por query string, como em `ProcessosPage`:
   * é atalho interno, não URL pra compartilhar. E só vale na PRIMEIRA
   * montagem -- reagindo à prop, trocar o filtro aqui seria desfeito no
   * render seguinte.
   */
  const { state } = useLocation();
  const navegacao = state as { status?: string } | null;
  /* O padrão do parâmetro num lugar só -- ver a nota gêmea em Histórico. */
  const statusPadrao = navegacao?.status ?? STATUS_TODOS;
  const [status, setStatus] = useEstadoNaUrl("status", statusPadrao, {
    tambemApaga: ["pagina"],
  });
  const [modalAberto, setModalAberto] = useState(false);
  const { atualizar } = useParametrosDaUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /** Debounce de verdade: sem ele cada tecla vira uma `queryKey` nova e uma
   * requisição -- digitar "silva" seriam cinco. */
  const busca = useValorComEspera(buscaInput);

  const parametros = {
    busca: busca || undefined,
    status: statusParaApi(status),
    pagina,
    tamanhoPagina,
  };

  const query = useQuery<RespostaDeAtendimentosPaginada>({
    queryKey: qk.atendimentos(parametros),
    /* Mantém a página anterior enquanto a nova vem. Sem isto a chave nasce
       fria, `isPending` vira true e a lista DESMONTA -- pisca a cada
       página, a cada filtro e a cada tecla da busca. */
    placeholderData: keepPreviousData,
    queryFn: () => listarAtendimentos(parametros) as Promise<RespostaDeAtendimentosPaginada>,
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os atendimentos.");

  /** Os subgrupos são do modal de criação, e ele precisa deles ABERTO --
   * por isso a consulta fica aqui, não lá dentro: assim ela já está pronta
   * (ou a caminho) quando o modal abre, em vez de começar no clique.
   *
   * ⚠️ Primeira página, não o catálogo. Quem precisar de um subgrupo fora
   * dela digita dentro do próprio seletor. */
  const subgrupos = useSubgruposBuscaveis(true);

  /* O nome do cliente vem em `cliente_nomes`, DENTRO de cada atendimento --
     campo derivado que o servidor resolve pra página pedida. Aqui havia uma
     consulta ao catálogo inteiro de clientes só pra traduzir id em nome. */

  const atendimentos = query.data?.atendimentos || [];
  const total = query.data?.total ?? 0;

  const temFiltro = Boolean(busca) || status !== STATUS_TODOS;

  /* 🔴 UMA escrita para os dois filtros. Chamados em sequência, cada
     `setSearchParams` parte da mesma URL e o segundo apaga o primeiro. */
  function limparFiltros() {
    atualizar(
      { busca: "", status: STATUS_TODOS }, { tambemApaga: ["pagina"] });
  }

  return (
    <Box>
      <CabecalhoAtendimentos
        carregando={query.isPending}
        buscando={query.isPlaceholderData || buscaInput !== busca}
        mostrando={atendimentos.length}
        total={total}
        busca={buscaInput}
        onBuscar={(valor) => {
          setBuscaInput(valor);
        }}
        status={status}
        onMudarStatus={(novo) => {
          setStatus(novo);
        }}
        onNovo={() => setModalAberto(true)}
      />

      {query.isPending ? (
        <Esqueleto linhas={6} />
      ) : query.isError ? (
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar os atendimentos."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <AreaAtualizando atualizando={query.isPlaceholderData}>
          <CartaoDeTabela>
            {atendimentos.length === 0 ? (
              <EstadoVazio
                /* Distingue "não existe nada" de "seus filtros não acharam
                   nada" -- confundir os dois faz a pessoa concluir que o
                   sistema está vazio. */
                mensagem={
                  temFiltro
                    ? "Nenhum atendimento com os filtros atuais."
                    : "Nenhum atendimento registrado ainda."
                }
                acao={
                  temFiltro ? (
                    <Botao variante="ghost" onClick={limparFiltros}>
                      Limpar filtros
                    </Botao>
                  ) : undefined
                }
              />
            ) : (
              <>
                {atendimentos.map((atendimento, indice) => (
                  <LinhaDeAtendimento
                    key={`${atendimento.subgrupo_id}:${atendimento.atendimento_id}`}
                    atendimento={atendimento}
                    onAbrir={(a) =>
                      navigate(`/atendimentos/${a.subgrupo_id}/${a.atendimento_id}`)
                    }
                    ultima={indice === atendimentos.length - 1}
                  />
                ))}
                <Pagination
                  pagina={pagina}
                  totalPaginas={query.data?.total_paginas ?? 1}
                  tamanhoPagina={tamanhoPagina}
                  total={total}
                  onMudarPagina={setPagina}
                  onMudarTamanho={setTamanhoPagina}
                />
              </>
            )}
          </CartaoDeTabela>
        </AreaAtualizando>
      )}

      {modalAberto && (
        <NovoAtendimentoForm
          subgrupos={subgrupos}
          onSalvo={() => {
            setModalAberto(false);
            queryClient.invalidateQueries({ queryKey: ["atendimentos"] });
          }}
          onFechar={() => setModalAberto(false)}
        />
      )}
    </Box>
  );
}
