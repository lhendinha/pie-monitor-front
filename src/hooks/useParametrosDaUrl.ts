import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { escreverParametroDaUrl } from "../utils/parametrosDaUrl";
import type { OpcoesDoEstadoNaUrl, ValorDaUrl } from "../types";

/** Escreve VÁRIOS parâmetros da URL numa vez só. É o mecanismo; o hook
 * abaixo é a conveniência de um valor.
 *
 * 🔴 **Por que a URL, e não memória:** ela responde de graça as quatro
 * perguntas que o estado de uma listagem tem -- voltar pelo navegador,
 * recarregar, mandar o link para alguém, e enxergar o estado sem abrir o
 * depurador. É o padrão do ecossistema (`useSearchParams`, search params do
 * TanStack Router, `searchParams` do Next) e já é o idioma DESTE projeto: o
 * detalhe do processo guarda a aba aberta assim, com a mesma justificativa
 * escrita.
 *
 * 🔴 **Vários de uma vez, e não um por chamada.** `setSearchParams` navega na
 * hora: duas chamadas do mesmo manipulador partem da MESMA URL, e a segunda
 * apaga a primeira. Foi assim que escolher um cliente (que grava o id E o
 * nome do rótulo) deixou a pílula acesa sem filtrar nada.
 *
 * ⚠️ **`replace`, não `push`.** Filtrar não é navegar: com `push`, cada tecla
 * da busca viraria um passo do histórico e "voltar" precisaria de vinte
 * cliques para sair da tela. Com `replace`, a entrada ATUAL carrega sempre o
 * estado mais recente -- e é justamente por isso que voltar do detalhe cai na
 * lista como ela estava.
 */
export function useParametrosDaUrl() {
  const [params, setParams] = useSearchParams();

  const atualizar = useCallback(
    (mudancas: Record<string, ValorDaUrl>, opcoes?: OpcoesDoEstadoNaUrl) => {
      setParams(
        (anteriores) => {
          const copia = new URLSearchParams(anteriores);
          /* ⚠️ Escreve TUDO que recebe, sem julgar se "vale a pena". Quem
             sabe o que é padrão -- e portanto o que deve sumir da URL -- é
             quem declarou o estado; aqui só chegaria adivinhação. Apagar se
             pede por `tambemApaga`. */
          for (const [chave, valor] of Object.entries(mudancas)) {
            escreverParametroDaUrl(copia, chave, valor);
          }
          opcoes?.tambemApaga?.forEach((k) => copia.delete(k));
          return copia;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { params, atualizar };
}
