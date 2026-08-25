import { getEmail, papelAtende } from "../../services";
import type { Subgrupo } from "../../types";

/** Se esta pessoa pode excluir ESTE subgrupo.
 *
 * Não é uma permissão de tela só, é o espelho da regra do servidor
 * (`subgrupos_service._garantir_pode_excluir`): `admin`+ exclui qualquer um,
 * `manager` só o que ele mesmo criou. Criar é `manager` e excluir era
 * `admin`, então quem criava por engano dependia de um admin pra desfazer o
 * próprio erro de dez segundos.
 *
 * O `criado_por` vazio dos subgrupos antigos não pode casar com ninguém --
 * sem o teste de vazio, um `getEmail()` nulo comparado a `""` passaria.
 */
export function podeExcluirSubgrupo(subgrupo: Subgrupo): boolean {
  if (papelAtende("admin")) return true;
  if (!papelAtende("manager")) return false;
  return Boolean(subgrupo.criado_por) && subgrupo.criado_por === getEmail();
}
