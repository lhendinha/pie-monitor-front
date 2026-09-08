import { NATUREZA_ENTRADA, NATUREZA_SAIDA } from "../../../../constants";
import {
  centavosParaPlanilha,
  formatarMes,
  montarCsv,
} from "../../../../utils";
import type { FluxoDeCaixa } from "../../../../types";

/** O CSV do fluxo: as MESMAS linhas e os mesmos números da tela.
 *
 * 🔴 **Sai do que já está na tela**, e não de uma rota nova: a resposta que
 * a pessoa está olhando tem tudo, e exportar pelo servidor seria repetir a
 * leitura da partição inteira (259 RCU medidos) para produzir os mesmos
 * números.
 *
 * 🔴 **Leva as linhas de saldo junto**, quando elas existem. Sem elas a
 * planilha não fecha com a tela: num mês passado `entradas - saídas` não
 * explica a diferença entre abrir e fechar, e quem tentasse conferir a
 * exportação encontraria uma diferença que parece erro.
 *
 * ⚠️ A ordem das colunas é a da tela: categoria, um mês por coluna, total.
 *
 * ➡️ `../index.test.tsx`.
 */
export function montarPlanilhaDoFluxo(fluxo: FluxoDeCaixa): string {
  const { meses } = fluxo;
  const linhas: (string | number)[][] = [
    ["Categoria", ...meses.map(formatarMes), "Total"],
  ];

  const secoes = [
    { natureza: NATUREZA_ENTRADA, rotulo: "ENTRADAS", porMes: fluxo.entradas_por_mes },
    { natureza: NATUREZA_SAIDA, rotulo: "SAÍDAS", porMes: fluxo.saidas_por_mes },
  ];

  for (const secao of secoes) {
    const daSecao = fluxo.linhas.filter((l) => l.natureza === secao.natureza);
    linhas.push([
      secao.rotulo,
      ...meses.map((m) => centavosParaPlanilha(secao.porMes[m] ?? 0)),
      centavosParaPlanilha(meses.reduce((s, m) => s + (secao.porMes[m] ?? 0), 0)),
    ]);
    for (const linha of daSecao) {
      linhas.push([
        linha.nome,
        ...meses.map((m) => centavosParaPlanilha(linha.por_mes[m] ?? 0)),
        centavosParaPlanilha(linha.total_centavos),
      ]);
    }
  }

  if (fluxo.saldo_disponivel) {
    for (const [rotulo, valores] of [
      ["Saldo anterior", fluxo.saldo_anterior_por_mes],
      ["Saldo do período", fluxo.saldo_do_periodo_por_mes],
      ["Saldo final", fluxo.saldo_final_por_mes],
    ] as const) {
      /* ⚠️ Sem total, como na tela: somar saldos de meses seguidos não
         significa nada -- o de dezembro já contém o de janeiro. */
      linhas.push([rotulo, ...meses.map((m) => centavosParaPlanilha(valores[m] ?? 0)), ""]);
    }
  }

  return montarCsv(linhas);
}

/** `fluxo-de-caixa-2026-01-a-2026-12.csv`.
 *
 * ⚠️ O nome leva o PERÍODO: quem exporta dois recortes acaba com dois
 * arquivos na pasta de downloads, e "fluxo-de-caixa (1).csv" não diz qual é
 * qual. */
export function nomeDoArquivoDoFluxo(meses: string[]): string {
  if (meses.length === 0) return "fluxo-de-caixa.csv";
  return `fluxo-de-caixa-${meses[0]}-a-${meses[meses.length - 1]}.csv`;
}
