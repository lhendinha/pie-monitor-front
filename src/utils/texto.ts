/** Comparação de texto que ignora acento e caixa.
 *
 * 🔴 Sem isto a ordem alfabética mente: "Ângela" cai DEPOIS de "Zuleica",
 * porque o código de `Â` é maior que o de `Z`. O mesmo vale pra busca --
 * quem digita "angela" não acha "Ângela" e conclui que o cliente não está
 * cadastrado.
 *
 * ⚠️ Espelha `normalizar()` de `api/src/shared/busca.py`, e precisa mesmo
 * espelhar: o servidor ordena e filtra a primeira página, e o front filtra
 * na mão as listas que já vieram com a tela (fase, situação). Se as duas
 * regras discordarem, a lista muda de critério no instante em que a pessoa
 * digita a primeira letra.
 *
 * ⚠️ Não corta espaço das pontas, igual ao Python -- quem corta é quem
 * busca (`contemTermo`). Numa CHAVE DE ORDENAÇÃO o corte mudaria a
 * comparação, e o servidor não corta.
 *
 * ⚠️ NÃO é exportada: hoje o único uso é `contemTermo`, logo abaixo, e quem
 * ordena estas listas é o servidor. Exportar sem consumidor é o tipo de
 * ponta solta que a varredura de código morto acusa. Quando o front
 * precisar ordenar alguma delas na mão, é ela que sobe.
 */
function normalizar(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** `termo` aparece em `alvo`, ignorando acento e caixa.
 *
 * Termo vazio aceita tudo -- é o estado "sem filtro", não "nada
 * corresponde". É o que faz o painel abrir com a lista inteira. */
export function contemTermo(alvo: string | null | undefined, termo: string): boolean {
  const buscado = normalizar(termo).trim();
  return buscado === "" || normalizar(alvo).includes(buscado);
}
