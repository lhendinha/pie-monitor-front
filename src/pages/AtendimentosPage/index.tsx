import { Box } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { TAMANHO_PAGINA_PADRAO } from "../../constants";
import { useValorComEspera } from "../../hooks/useValorComEspera";
import {
  listarAtendimentos,
  listarTodosOsMembrosDoGrupo,
  papelAtende,
} from "../../services";
import { useToastOnQueryError } from "../../services/queryClient";
import { qk } from "../../services/queryKeys";
import CabecalhoAtendimentos from "./components/CabecalhoAtendimentos";
import LinhaDeAtendimento from "./components/LinhaDeAtendimento";
import NovoAtendimentoForm from "./components/NovoAtendimentoForm";
import { STATUS_TODOS, statusParaApi } from "./constants";
import { useTodosOsClientes, useTodosOsSubgrupos } from "../../hooks/useCatalogos";
import type {
  RespostaDeAtendimentosPaginada,
  RespostaDeMembros,
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
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_PADRAO);
  const [buscaInput, setBuscaInput] = useState("");
  const [status, setStatus] = useState<string>(STATUS_TODOS);
  const [modalAberto, setModalAberto] = useState(false);
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
   * (ou a caminho) quando o modal abre, em vez de começar no clique. */
  const subgruposQuery = useTodosOsSubgrupos();

  /** Nomes dos clientes, pra linha mostrar nome em vez de id.
   *
   * Uma consulta pra lista inteira, não uma por linha: dez atendimentos com
   * dois clientes cada seriam vinte requisições pra mostrar vinte palavras.
   */
  const clientesQuery = useTodosOsClientes();
  const nomePorId = useMemo(
    () => new Map((clientesQuery.data || []).map((c) => [c.cliente_id, c.nome])),
    [clientesQuery.data],
  );

  /** Apelidos de quem escreveu. `manager` pra cima -- pra `user` a lista
   * não vem, e o avatar cai nas iniciais do e-mail, que ainda identifica. */
  const membrosQuery = useQuery<RespostaDeMembros>({
    queryKey: qk.todosOsMembros(),
    queryFn: listarTodosOsMembrosDoGrupo,
    enabled: papelAtende("manager"),
  });
  const apelidoPorEmail = useMemo(
    () =>
      new Map((membrosQuery.data?.membros || []).map((m) => [m.email, m.apelido || m.email])),
    [membrosQuery.data],
  );

  const atendimentos = query.data?.atendimentos || [];
  const total = query.data?.total ?? 0;
  const temFiltro = Boolean(busca) || status !== STATUS_TODOS;

  function limparFiltros() {
    setBuscaInput("");
    setStatus(STATUS_TODOS);
    setPagina(1);
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
          // Buscar da página 3 deixaria a lista vazia sem motivo aparente.
          setPagina(1);
        }}
        status={status}
        onMudarStatus={(novo) => {
          setStatus(novo);
          setPagina(1);
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
                    nomeDoCliente={(id) => nomePorId.get(id)}
                    nomeDoAutor={(email) => apelidoPorEmail.get(email) ?? email}
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
                  onMudarTamanho={(novo) => {
                    setTamanhoPagina(novo);
                    setPagina(1);
                  }}
                />
              </>
            )}
          </CartaoDeTabela>
        </AreaAtualizando>
      )}

      {modalAberto && (
        <NovoAtendimentoForm
          subgrupos={subgruposQuery.data || []}
          carregandoSubgrupos={subgruposQuery.isPending}
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
