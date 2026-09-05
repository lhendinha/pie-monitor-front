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
