import { papelAtende } from "../services";

/** Se esta pessoa consegue listar o catálogo do grupo (`GET /grupos/membros`).
 *
 * Espelho do piso da rota, no idioma de `podeDestruirDocumento`: uma função
 * pura, num lugar só, em vez de `papelAtende("manager")` repetido em cada
 * tela que oferece a pílula.
 *
 * ⚠️ **Esconder não é a proteção** -- quem manda é a rota. É pra não oferecer
 * o que ela vai negar.
 */
export function podeListarPessoas(): boolean {
  return papelAtende("manager");
}


/** Se esta pessoa pode agir em LOTE sobre tarefas (`POST /tarefas/*-em-lote`).
 *
 * 🔴 Piso `manager`+, e a assimetria com a ação unitária é deliberada: apagar
 * uma tarefa é `user`, apagar cem é ferramenta de potência. Quem é `user`
 * segue agindo uma a uma.
 *
 * ⚠️ **Esconder não é a proteção** -- quem manda é a rota, que devolve 403.
 * É para não oferecer o que ela vai negar. Mesma régua de
 * `podeListarPessoas`.
 */
export function podeAgirEmLote(): boolean {
  return papelAtende("manager");
}
