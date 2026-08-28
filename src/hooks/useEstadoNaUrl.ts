import { useCallback, useMemo } from "react";

import { useParametrosDaUrl } from "./useParametrosDaUrl";
import { lerParametroDaUrl } from "../utils/parametrosDaUrl";
import type { Alargado, MudarEstadoNaUrl, OpcoesDoEstadoNaUrl, ValorDaUrl } from "../types";

/** UM valor da URL, com a cara do `useState`.
 *
 * 🔴 É casca fina sobre `useParametrosDaUrl` -- o mecanismo de escrita é um
 * só. Dois caminhos independentes para mexer na mesma URL seria a receita da
 * escrita que apaga a outra, que é justamente o defeito que este arquivo
 * existe para não repetir.
 *
 * ⚠️ **O setter NÃO aceita a forma funcional** (`p => p + 1`), de propósito:
 * ela precisaria ler o valor de DENTRO da escrita para não partir de um
 * render velho, e nenhuma tela precisa disso -- a paginação sempre manda o
 * número que quer. Uma forma a menos é uma armadilha a menos.
 *
 * ⚠️ **O padrão não vai na URL.** `pagina=1` e `tamanho=10` são o estado de
 * quem não escolheu nada; escrevê-los encheria o endereço de ruído e faria
 * toda tela nascer com query.
 */
export function useEstadoNaUrl<T extends ValorDaUrl>(
  chave: string,
  inicial: T,
  opcoes?: OpcoesDoEstadoNaUrl,
): readonly [Alargado<T>, MudarEstadoNaUrl<Alargado<T>>] {
  const { params, atualizar } = useParametrosDaUrl();

  const valor = useMemo(
    () => lerParametroDaUrl(params, chave, inicial),
    [params, chave, inicial],
  );

  const mudar = useCallback(
    /* 🔴 Escrever ou APAGAR, e a decisão é daqui: só este hook conhece o
       padrão da sua chave. Voltar ao padrão APAGA o parâmetro -- é o que
       mantém a URL limpa sem o mecanismo de escrita ter de adivinhar nada. */
    (proximo: T) => {
      if (proximo === inicial) {
        atualizar({}, { tambemApaga: [chave, ...(opcoes?.tambemApaga ?? [])] });
        return;
      }
      atualizar({ [chave]: proximo }, opcoes);
    },
    [atualizar, chave, inicial, opcoes],
  );

  /* O `as` fecha a conta que `Alargado` faz na assinatura: por dentro tudo é
     `T`, e quem chama enxerga o tipo largo. */
  return [valor, mudar] as unknown as readonly [
    Alargado<T>,
    MudarEstadoNaUrl<Alargado<T>>,
  ];
}
