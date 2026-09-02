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
  opcoes: { aguarda?: readonly string[] } = {},
): {
  mudou: boolean;
  resemear: (chave: string, parcial: Partial<T>) => void;
  refazerRetrato: () => void;
} {
  const { aguarda } = opcoes;

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
  /* 🔴 O mesmo conjunto em ESTADO, e não é duplicação à toa: o `aguarda` é
     lido durante a renderização, e ref lido no render é o antipadrão que o
     React Compiler proíbe -- além de não re-renderizar quando muda, que era
     exatamente o defeito (o gate nunca destravava).
     O ref continua existindo para a DEDUÇÃO, que roda dentro do callback e
     precisa enxergar a chave na mesma tarefa: duas chamadas no mesmo lote
     leriam o estado velho e semeariam duas vezes. */
  const [semeadas, setSemeadas] = useState<ReadonlySet<string>>(() => new Set());

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
    setSemeadas((anteriores) => new Set(anteriores).add(chave));
    setRetrato((anterior) => ({ ...anterior, ...parcial }));
  }, []);

  /** Novo marco zero, com os valores de agora. Para o modal que salva e
   * CONTINUA aberto: depois de gravar, o que está na tela passa a ser o
   * salvo, e perguntar sobre ele seria mentira. */
  const refazerRetrato = useCallback(() => {
    jaSemeadas.current.clear();
    setSemeadas(new Set());
    setRetrato(valoresRef.current);
  }, []);

  /* 🔴 Enquanto uma semeadura DECLARADA não chegou, nada mudou.
   *
   * Fecha uma fresta de uma renderização: quando o valor semeado é derivado
   * de uma consulta, ele muda no render em que a resposta chega, e o
   * `resemear` só avisa o retrato no efeito seguinte. Entre os dois, o
   * formulário se declararia alterado sem ninguém ter tocado em nada -- e um
   * Escape ali abriria a pergunta.
   *
   * ⚠️ O hook já sabe o que foi semeado (`jaSemeadas`), então quem chama só
   * declara o que ESPERA. Antes isto era um `useState` avulso em cada
   * formulário, com um `|| Boolean(...)` para os casos em que a semeadura não
   * aconteceria -- redundante e fácil de esquecer.
   *
   * ⚠️ Declare só chave que VAI chegar. Uma que nunca chega deixa a guarda
   * muda para sempre, e aí o formulário volta a ser descartado em silêncio.
   *
   * ⚠️ Não é o mecanismo principal, que é o `resemear`. Onde a semeadura
   * chama `resemear` no MESMO lote dos `setState` dela -- dentro de um `.then`
   * ou do próprio efeito -- não há fresta, e declarar não é preciso. */
  const esperando = Boolean(aguarda?.some((chave) => !semeadas.has(chave)));

  let mudou = false;
  if (!esperando) {
    for (const chave of new Set([...Object.keys(retrato), ...Object.keys(valores)])) {
      if (!mesmoValor(retrato[chave], valores[chave])) {
        mudou = true;
        break;
      }
    }
  }

  return { mudou, resemear, refazerRetrato };
}
