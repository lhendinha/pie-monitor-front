import { getEmail, papelAtende } from "../../services";

/** Se esta pessoa pode tirar `email` da lista de responsáveis.
 *
 * Espelho de `membros_service.garantir_pode_mexer_nos_responsaveis`, no molde
 * de `podeDestruirDocumento`: acrescentar e SAIR são de qualquer membro;
 * **tirar OUTRA pessoa é `manager`+**.
 *
 * 🔴 **Esconder não é a proteção** -- quem manda é a rota. É pra não oferecer
 * o que ela vai negar: um "x" que existe e devolve 400 é pior que um ausente,
 * porque a pessoa tenta, espera, e recebe uma recusa que parece defeito.
 *
 * ⚠️ **A terceira da família, e não uma função genérica.** `podeDestruirDocumento`
 * e `podeExcluirSubgrupo` têm a mesma FORMA ("`manager`+ ou é seu"), mas
 * regras diferentes: uma compara `criado_por`, a outra exige `admin` como
 * atalho, esta compara a própria sessão. Um helper comum precisaria de
 * parâmetro pra cada diferença e esconderia justamente o que cada tela decide
 * -- que é o oposto do que essas funções existem pra fazer.
 *
 * ⚠️ **O `Boolean(email)` não é sobra**, e vem das duas irmãs: elas guardam o
 * vazio porque `getEmail()` nulo comparado a `""` passaria. Aqui o mesmo:
 * `localStorage.getItem` devolve `""` se a chave existir vazia, e sem esta
 * guarda um e-mail vazio se compararia com ele.
 */
export function podeRemoverResponsavel(email: string): boolean {
  if (papelAtende("manager")) return true;
  return Boolean(email) && email === getEmail();
}
