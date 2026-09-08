import { mesPorExtenso, somarMeses } from "../../../../utils";

/** O que cada coluna é: o passado ACONTECEU, o futuro é expectativa, e o mês
 * corrente é os dois.
 *
 * 🔴 Esta distinção é a coisa mais importante da tabela, e por isso ela
 * aparece TRÊS vezes: na legenda de cima, no subtítulo de cada coluna e no
 * fundo âmbar das colunas de previsão. Um relatório em que não se sabe o que
 * já é fato e o que é palpite não serve para decidir nada.
 *
 * ⚠️ O mês corrente é `REALIZADO + PREVISTO`: parte dele já aconteceu e o
 * resto ainda vai vencer. Chamá-lo de só realizado faria a projeção do mês
 * sumir; de só previsto, apagaria o que já entrou.
 */
export function naturezaDaColuna(mes: string, mesCorrente: string): string {
  if (mes < mesCorrente) return "REALIZADO";
  if (mes === mesCorrente) return "REALIZADO + PREVISTO";
  return "PREVISTO";
}

/** Coluna que ainda não aconteceu inteira -- a corrente e as futuras. É o
 * que ganha o fundo âmbar. */
export function ehPrevisao(mes: string, mesCorrente: string): boolean {
  return mes >= mesCorrente;
}

/** A legenda do topo: o que a tabela mostra, em uma frase.
 *
 * `FLUXO DE CAIXA · ESTE ANO · REALIZADO ATÉ AGOSTO DE 2026, PREVISTO DE
 * SETEMBRO EM DIANTE`
 *
 * ⚠️ As três formas existem porque o período pode não cruzar hoje: um
 * recorte inteiro no passado não tem previsão nenhuma, e um inteiro no
 * futuro não tem nada realizado. Escrever a frase do meio nos três casos
 * prometeria uma metade que a tabela não tem.
 */
export function legendaDoFluxo(
  meses: string[],
  mesCorrente: string,
  rotuloDoPeriodo: string,
): string {
  const inicio = `FLUXO DE CAIXA · ${rotuloDoPeriodo.toUpperCase()}`;
  if (meses.length === 0) return inicio;
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];

  if (ultimo < mesCorrente) return `${inicio} · REALIZADO`;
  if (primeiro > mesCorrente) return `${inicio} · PREVISTO`;
  if (primeiro === mesCorrente) {
    return `${inicio} · PREVISTO DE ${mesPorExtenso(mesCorrente, false)} EM DIANTE`;
  }
  return (
    `${inicio} · REALIZADO ATÉ ${mesPorExtenso(somarMeses(mesCorrente, -1))}, ` +
    `PREVISTO DE ${mesPorExtenso(mesCorrente, false)} EM DIANTE`
  );
}
