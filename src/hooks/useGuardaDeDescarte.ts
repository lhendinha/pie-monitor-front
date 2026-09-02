import { useCallback, useEffect, useRef, useState } from "react";

import type { ValorDeFormulario } from "../types";
import { mesmoValor } from "../utils";

/** O formulário mudou desde que abriu?
 *
 * 🔴 **O marco zero é o retrato da ABERTURA, e não "formulário vazio".** Um
 * modal de criação que nasce populado pelo contexto -- a tarefa que já vem com
 * a coluna, a data e o processo de onde foi aberta -- não pode perguntar nada a
 * quem só abriu e desistiu. Esse é o gesto mais comum de todos, e uma pergunta
 * ali ensina a clicar sem ler.
 *
 * 🔴 **A regra da projeção: passe o valor que o ENVIO mandaria.** Não o texto
 * cru do campo, nem o valor derivado que a tela mostra. Isso resolve três
 * armadilhas de uma vez, e as três foram medidas neste código:
 *
 * - **máscara** -- `mascararTelefone` com dois dígitos vira `(12)`, e backspace
 *   nunca devolve `""`: o campo ficaria "alterado" para sempre. Projete
 *   `apenasDigitos(telefone)`.
 * - **normalização** -- o envio faz `assunto.trim()`; projete já com `trim`,
 *   senão um espaço solto deixa o Salvar desabilitado e a guarda perguntando
 *   ao mesmo tempo.
 * - **ausente vs vazio** -- um campo opcional que nasce fora do objeto e vira
 *   `""` ao ser digitado e apagado. Normalize para `""` na projeção;
 *   `mesmoValor` não coage nada de propósito.
 *
 * ⚠️ **Projetar o DERIVADO suja sozinho, projetar o CRU suja no re-escolher.**
 * Os dois lados erram: `subgrupoEscolhido` muda quando a consulta resolve e
 * define o padrão; `subgrupoId` fica `""` até alguém escolher, então
 * re-escolher no Select a opção que JÁ aparecia marcada conta como mudança.
 * A saída é projetar o valor do envio e chamar `resemear` quando quem definiu
 * foi o sistema -- ver abaixo.
 */
export function useGuardaDeDescarte<T extends Record<string, ValorDeFormulario>>(
  valores: T,
  opcoes: { pronto?: boolean } = {},
): {
  mudou: boolean;
  resemear: (chave: string, parcial: Partial<T>) => void;
  refazerRetrato: () => void;
} {
  const { pronto = true } = opcoes;

  /* Inicializador preguiçoso: roda uma vez, na montagem. É literalmente "como
     o formulário estava quando abriu". */
  const [retrato, setRetrato] = useState<T>(() => valores);

  /* ⚠️ Escrita em EFEITO sem deps, não no corpo -- mesma razão do `pedirRef`
     do `Modal`: o React Compiler proíbe mexer em ref durante a renderização,
     porque pode descartar e refazer uma. */
  const valoresRef = useRef(valores);
  useEffect(() => {
    valoresRef.current = valores;
  });

  /* 🔴 Quem já semeou não semeia de novo, e é por CHAVE.
   *
   * Sem isto, um refetch re-executaria a semeadura NO MEIO da edição e
   * re-basearia o retrato: o que a pessoa digitou passaria a ser o marco zero,
   * e o Escape descartaria em silêncio. E o risco não é teórico -- o
   * `queryClient` tem `staleTime: 0` e não desliga `refetchOnWindowFocus`,
   * então basta voltar para a aba.
   *
   * ⚠️ Por CHAVE, e não um sinal único, porque um formulário pode ter mais de
   * uma semeadura independente: o `EditarMembroForm` tem duas, e um sinal só
   * deixaria a segunda calada. */
  const jaSemeadas = useRef(new Set<string>());

  /** Avisa que quem definiu estes valores foi o SISTEMA, não a pessoa.
   *
   * Chame de dentro do mesmo lugar que gravou o estado, **com os mesmos
   * literais que acabou de gravar**. Não é firula: um efeito do hook rodando
   * no mesmo commit ainda leria os valores de antes da semeadura, porque o
   * `setState` dela só se aplica no render seguinte. Passando os literais, a
   * ordem dos efeitos deixa de importar.
   *
   * ⚠️ NÃO chame ao limpar campos por ação da pessoa (trocar de grupo, trocar
   * de subgrupo): ali a mudança é dela, e tem que sujar. */
  const resemear = useCallback((chave: string, parcial: Partial<T>) => {
    if (jaSemeadas.current.has(chave)) return;
    jaSemeadas.current.add(chave);
    setRetrato((anterior) => ({ ...anterior, ...parcial }));
  }, []);

  /** Novo marco zero, com os valores de agora. Para o modal que salva e
   * CONTINUA aberto: depois de gravar, o que está na tela passa a ser o
   * salvo, e perguntar sobre ele seria mentira. */
  const refazerRetrato = useCallback(() => {
    jaSemeadas.current.clear();
    setRetrato(valoresRef.current);
  }, []);

  /* Enquanto não está pronto, nada mudou. É o cinto para "abriu, a consulta
     ainda corre, apertou Esc" -- não é o mecanismo principal, que é o
     `resemear`. */
  let mudou = false;
  if (pronto) {
    for (const chave of new Set([...Object.keys(retrato), ...Object.keys(valores)])) {
      if (!mesmoValor(retrato[chave], valores[chave])) {
        mudou = true;
        break;
      }
    }
  }

  return { mudou, resemear, refazerRetrato };
}
