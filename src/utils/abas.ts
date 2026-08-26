/** Os ids que ligam uma aba ao painel que ela comanda.
 *
 * 🔴 Uma função por ponta, e as duas aqui -- não montadas à mão em cada
 * componente. `Abas` escreve `aria-controls` e `PainelDaAba` escreve o `id`;
 * se cada um interpolasse a própria string, bastaria alguém trocar um
 * separador de um lado pra o vínculo apontar pro vazio. E `aria-controls`
 * quebrado não aparece na tela: só some do leitor de tela, em silêncio.
 *
 * O `grupo` existe porque duas listas de abas podem coexistir numa página --
 * sem ele, "detalhes" de uma colidiria com "detalhes" da outra, e o
 * navegador resolveria o `aria-controls` pro primeiro que encontrasse.
 */
/** O nome do parâmetro que carrega a aba na URL (`?aba=tarefas`).
 *
 * Aqui, e não numa página: detalhe do processo e detalhe do cliente usam o
 * MESMO nome, e duas cópias da string são duas chances de uma virar "tab"
 * num deploy e os links da outra pararem de abrir onde deviam.
 *
 * 🔴 Nem toda tela de abas guarda na URL. `GrupoPage` e `PerfilPage` usam
 * estado local de propósito: são telas de gestão, alcançadas pelo menu. As
 * de DETALHE são alcançadas por link -- do e-mail, do Kanban, da Agenda --,
 * e um F5 que devolve a pessoa pra primeira aba ali incomoda de verdade.
 */
export const PARAM_DA_ABA = "aba";

export const idDaAba = (grupo: string, id: string) => `${grupo}-aba-${id}`;

export const idDoPainel = (grupo: string, id: string) => `${grupo}-painel-${id}`;

/** A aba que veio da URL, ou a primeira da lista.
 *
 * 🔴 Genérica e AQUI, não uma cópia dentro de cada página. Detalhe do
 * processo e detalhe do cliente guardam a aba na URL do mesmo jeito, e
 * `?aba=xyz` -- link velho, link editado à mão, aba renomeada num deploy --
 * tem que cair na primeira em vez de numa tela em branco. Duas cópias disso
 * é uma que alguém conserta e outra que fica.
 *
 * Devolve o `id` DA LISTA, não o que veio na URL: é o que faz o tipo sair
 * como a união das abas daquela página, e não `string`.
 */
export function abaValida<T extends string>(
  abas: readonly { id: T }[],
  bruto: string | null,
): T {
  const achada = abas.find((a) => a.id === bruto);
  return achada ? achada.id : abas[0].id;
}
