import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import {
  CartaoDeTabela,
  Esqueleto,
  EstadoDeErro,
  EstadoVazio,
  Pagination,
  Tabela,
} from "../../../../components";
import { usePaginacaoDaLista } from "../../../../hooks/usePaginacaoDaLista";
import { useSubgruposBuscaveis } from "../../../../hooks/useSubgruposBuscaveis";
import { lerCatalogoFinanceiro, listarLancamentos } from "../../../../services";
import { useToastOnQueryError } from "../../../../services/queryClient";
import { qk } from "../../../../services/queryKeys";
import { contaDoLancamento, periodoPorExtenso } from "../../../../utils";
import type { CatalogoFinanceiro } from "../../../../types";
import type { RespostaDeLancamentos } from "../../../../types/respostas";
import { COLUNAS_DE_LANCAMENTOS } from "../../constants";
import { useFiltrosDeLancamentos } from "../../hooks/useFiltrosDeLancamentos";
import CartoesDeTotais from "../CartoesDeTotais";
import FiltrosDeLancamentos from "../FiltrosDeLancamentos";
import LinhaDeLancamento from "../LinhaDeLancamento";

/** A lista de lançamentos: os três cards, os filtros e a tabela.
 *
 * 🔴 **Uma leitura serve os cards E a tabela.** `GET /lancamentos` devolve os
 * `totais` do período junto com a página, então somar as linhas visíveis
 * para desenhar os cards daria um número diferente a cada virada de página
 * -- e nenhum dos dois seria o do escritório.
 *
 * ⚠️ **O catálogo é lido à parte, e inteiro**: o lançamento traz só os ids da
 * categoria e da conta, e é dele que saem os nomes. É uma Query só no
 * servidor, e a alternativa seria uma consulta por linha.
 *
 * ➡️ `pages/FinanceiroPage/index.test.tsx`.
 */
export default function ListaDeLancamentos() {
  const navegar = useNavigate();
  const { filtros, intervalo, mudar } = useFiltrosDeLancamentos();
  const { pagina, setPagina, tamanhoPagina, setTamanhoPagina } = usePaginacaoDaLista();
  const departamentos = useSubgruposBuscaveis(true);

  const parametros = {
    /* 🔴 Com `vencendo` ligado, o período NÃO vai: do lado do servidor ele
       troca a Query do vencimento pela do índice esparso dos abertos, e
       mandar as duas pontas junto faria a tela dizer um recorte (a pílula) e
       o servidor aplicar outro. A pílula de período some enquanto ele está
       ligado, pelo mesmo motivo. */
    de: filtros.vencendo ? undefined : intervalo?.de,
    ate: filtros.vencendo ? undefined : intervalo?.ate,
    vencendo: filtros.vencendo || undefined,
    tipo: filtros.tipo || undefined,
    natureza: filtros.natureza || undefined,
    situacao: filtros.situacao || undefined,
    conta_id: filtros.contaId || undefined,
    /* ⚠️ A API aceita UM departamento por vez. Com vários escolhidos, manda
       o primeiro -- e o painel deixa escolher mais porque a Fase 6 vai
       precisar; enquanto isso, escolher dois filtra pelo primeiro, o que é
       melhor que ignorar a escolha inteira. */
    subgrupo_id: filtros.departamentoIds[0] || undefined,
    busca: filtros.busca || undefined,
    pagina,
    tamanhoPagina,
  };

  const query = useQuery<RespostaDeLancamentos>({
    queryKey: qk.lancamentos(parametros),
    queryFn: () => listarLancamentos(parametros),
    placeholderData: (anterior) => anterior,
  });
  useToastOnQueryError(query.error, "Não foi possível carregar os lançamentos.");

  const catalogo = useQuery<CatalogoFinanceiro>({
    queryKey: qk.catalogoFinanceiro(),
    queryFn: lerCatalogoFinanceiro,
  });

  const nomeDaCategoria = (id: string) =>
    catalogo.data?.categorias.find((c) => c.categoria_id === id)?.nome ?? "";

  const lancamentos = query.data?.lancamentos ?? [];

  return (
    <>
      {query.data && (
        <CartoesDeTotais
          totais={query.data.totais}
          periodo={periodoPorExtenso(filtros.periodoId)}
          /* ⚠️ Zera o `tipo` junto: o card fala em natureza, e um
              `tipo=saida` que tivesse sobrado da pílula cruzaria com
              "a receber" e devolveria lista vazia. */
          onFiltrar={(situacao, natureza) => mudar({ situacao, natureza, tipo: "" })}
        />
      )}

      <FiltrosDeLancamentos
        filtros={filtros}
        onMudar={mudar}
        contas={catalogo.data?.contas ?? []}
        departamentos={departamentos}
      />

      {query.isPending ? (
        <Esqueleto />
      ) : query.isError ? (
        <CartaoDeTabela>
          <EstadoDeErro
            mensagem="Não foi possível carregar os lançamentos."
            onTentarDeNovo={() => query.refetch()}
            tentando={query.isFetching}
          />
        </CartaoDeTabela>
      ) : (
        <CartaoDeTabela>
          <Tabela
            colunas={COLUNAS_DE_LANCAMENTOS}
            vazio={
              lancamentos.length === 0 ? (
                <EstadoVazio mensagem="Nenhum lançamento neste período." />
              ) : undefined
            }
          >
            {lancamentos.map((l) => (
              <LinhaDeLancamento
                key={l.lancamento_id}
                lancamento={l}
                categoriaNome={nomeDaCategoria(l.categoria_id)}
                contaNome={contaDoLancamento(l, catalogo.data)}
                onAbrir={() => navegar(`/financeiro/lancamentos/${l.lancamento_id}`)}
              />
            ))}
          </Tabela>
          <Pagination
            pagina={pagina}
            totalPaginas={query.data?.total_paginas ?? 0}
            total={query.data?.total ?? 0}
            tamanhoPagina={tamanhoPagina}
            onMudarPagina={setPagina}
            onMudarTamanho={setTamanhoPagina}
          />
        </CartaoDeTabela>
      )}
    </>
  );
}
