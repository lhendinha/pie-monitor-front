import { useCallback, useState } from "react";

import { PERIODO_PERSONALIZADO } from "../../../constants";
import { useParametrosDaUrl } from "../../../hooks/useParametrosDaUrl";
import { intervaloDoPeriodo } from "../../../utils";
import { lerParametroDaUrl } from "../../../utils/parametrosDaUrl";
import type { FiltrosDaListaDeLancamentos } from "../types";

/** O estado da barra de filtros, guardado na URL.
 *
 * 🔴 **Na URL, e não em `useState`**, pela mesma razão das sete listagens do
 * projeto: a tela é alcançada por link -- a Área de trabalho abre "A receber
 * atrasado" já filtrado --, e um F5 que devolvesse a lista ao padrão perderia
 * o recorte que a pessoa estava lendo.
 *
 * 🔴 **Uma escrita só, por `useParametrosDaUrl`, e não um `useEstadoNaUrl`
 * por filtro.** `setSearchParams` navega na hora: duas chamadas do mesmo
 * manipulador partem da MESMA URL e a segunda apaga a primeira. Medido aqui:
 * clicar no card "A receber" mandava situação E tipo, e só a situação
 * chegava -- a lista filtrava metade do que o card prometia. É o mesmo
 * defeito que o docstring daquele hook já descrevia.
 *
 * ⚠️ **Mudar qualquer filtro volta para a PÁGINA 1.** A página 4 do mês
 * inteiro não existe no filtro de uma conta só, e o servidor devolveria
 * vazio -- a tela mostraria "nenhum lançamento" com 200 deles ali.
 *
 * ➡️ `components/ListaDeLancamentos/index.test.tsx`.
 */
export function useFiltrosDeLancamentos() {
  const { params, atualizar } = useParametrosDaUrl();

  /** ⚠️ O NOME de cada departamento escolhido fica em memória, e não na URL:
   * ele é conveniência de exibição (para o escolhido não sumir do próprio
   * valor quando estiver fora da primeira página da busca), e escrevê-lo no
   * endereço encheria a URL de texto que ninguém lê. Num F5 ele se perde e o
   * `MultiSelect` mostra o id até a busca voltar -- é o preço, e é pequeno. */
  const [departamentoNomes, setDepartamentoNomes] = useState<Record<string, string>>({});

  /* ⚠️ O tipo vai explícito: sem ele o padrão literal `"mes"` estreita
     `periodoId` para esse único valor, e o `tsc` recusa a comparação com
     `PERIODO_PERSONALIZADO` como "sem sobreposição" -- um erro de tipo sobre
     um código que funciona. */
  const periodoId: string = lerParametroDaUrl(params, "periodo", "mes");
  const de = lerParametroDaUrl(params, "de", "");
  const ate = lerParametroDaUrl(params, "ate", "");

  /** O intervalo que vai para a consulta.
   *
   * 🔴 DERIVADO do período, e não lido cru da URL. No primeiro carregamento
   * `de` e `ate` não existem ainda -- ninguém escolheu nada --, e a pílula já
   * diz "Este mês" por ser o padrão. Sem esta derivação a consulta iria sem
   * as duas pontas, a lista mostraria o ano inteiro, e a tela estaria dizendo
   * um recorte e mostrando outro.
   *
   * ⚠️ No PERSONALIZADO é o contrário: ali as datas SÃO a escolha, e não há o
   * que derivar. */
  const intervalo =
    periodoId === PERIODO_PERSONALIZADO
      ? de && ate
        ? { de, ate }
        : null
      : intervaloDoPeriodo(periodoId);

  const filtros: FiltrosDaListaDeLancamentos = {
    periodoId,
    intervaloPersonalizado: de && ate ? { de, ate } : undefined,
    tipo: lerParametroDaUrl(params, "tipo", ""),
    situacao: lerParametroDaUrl(params, "situacao", ""),
    contaId: lerParametroDaUrl(params, "conta", ""),
    departamentoIds: lerParametroDaUrl(params, "departamento", [] as string[]),
    departamentoNomes,
    busca: lerParametroDaUrl(params, "busca", ""),
  };

  const mudar = useCallback(
    (mudanca: Partial<FiltrosDaListaDeLancamentos>) => {
      const escrever: Record<string, string | string[]> = {};

      if (mudanca.periodoId !== undefined) {
        escrever.periodo = mudanca.periodoId;
        /* 🔴 O intervalo é DERIVADO do período escolhido, menos no
           personalizado, em que ele é a própria escolha. Sem estas duas
           linhas, trocar de "Este mês" para "Este ano" deixaria as datas do
           mês antigas na URL, e a lista mostraria o mês com a pílula dizendo
           ano. */
        const intervaloNovo =
          mudanca.periodoId === PERIODO_PERSONALIZADO
            ? mudanca.intervaloPersonalizado
            : intervaloDoPeriodo(mudanca.periodoId);
        escrever.de = intervaloNovo?.de ?? "";
        escrever.ate = intervaloNovo?.ate ?? "";
      }
      if (mudanca.tipo !== undefined) escrever.tipo = mudanca.tipo;
      if (mudanca.situacao !== undefined) escrever.situacao = mudanca.situacao;
      if (mudanca.contaId !== undefined) escrever.conta = mudanca.contaId;
      if (mudanca.departamentoIds !== undefined) escrever.departamento = mudanca.departamentoIds;
      if (mudanca.busca !== undefined) escrever.busca = mudanca.busca;
      if (mudanca.departamentoNomes !== undefined) setDepartamentoNomes(mudanca.departamentoNomes);

      // ⚠️ `tambemApaga` da página: mudar filtro volta para a primeira.
      if (Object.keys(escrever).length > 0) atualizar(escrever, { tambemApaga: ["pagina"] });
    },
    [atualizar],
  );

  return { filtros, intervalo, mudar };
}
