import type { OpcaoDeSelect } from "../types";

/** Garante que o item ESCOLHIDO tenha rótulo, mesmo fora da página atual.
 *
 * 🔴 A pílula desenha o rótulo procurando o valor entre as opções. Com só a
 * primeira página carregada, o cliente escolhido ontem quase nunca está
 * nela: a pílula ficava azul (filtro ligado) e sem texto, ou mostrando o id
 * cru. É por isso que o NOME do escolhido é guardado junto do id no estado
 * do filtro -- ele não pode depender de a lista certa estar na tela.
 */
export function comOpcaoEscolhida(
  opcoes: OpcaoDeSelect[],
  valor: string,
  rotulo: string,
): OpcaoDeSelect[] {
  if (!valor || opcoes.some((o) => o.value === valor)) return opcoes;
  return [{ value: valor, label: rotulo || valor }, ...opcoes];
}

/** Versão de `comOpcaoEscolhida` pra escolha MÚLTIPLA.
 *
 * 🔴 Aqui o estrago é maior que um rótulo feio. O `MultiSelect` monta o
 * `value` filtrando as opções pelos ids escolhidos: id que não está na lista
 * carregada simplesmente SOME do valor -- a pílula passa de "3 selecionados"
 * pra "1", sem ninguém ter desmarcado nada, e aplicar gravaria essa perda.
 */
export function comOpcoesEscolhidas(
  opcoes: OpcaoDeSelect[],
  valores: string[],
  nomes: Record<string, string>,
): OpcaoDeSelect[] {
  const presentes = new Set(opcoes.map((o) => o.value));
  const faltantes = valores
    .filter((v) => !presentes.has(v))
    .map((v) => ({ value: v, label: nomes[v] || v }));
  return faltantes.length ? [...faltantes, ...opcoes] : opcoes;
}
