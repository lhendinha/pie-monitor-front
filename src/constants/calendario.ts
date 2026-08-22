/** Nomes de mês e dia da semana, em tabela fixa.
 *
 * ⚠️ **Não** usar `Intl`/`toLocaleDateString` pra isso. Eles dependem do ICU
 * do ambiente: onde o ICU vem reduzido (algumas builds de Node, navegador
 * enxuto), o mês volta em inglês ou como "M08". O artifact tem a mesma
 * tabela pelo mesmo motivo.
 */
export const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/** Iniciais na ordem do calendário (domingo primeiro), como no artifact. */
export const DIAS_SEMANA_CURTOS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;
