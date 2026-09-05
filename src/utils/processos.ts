import { CAMPOS_DO_CORPO_DE_PROCESSO } from "../constants/processo";
import type { CamposOpcionaisProcesso } from "../types";
import { mesmoValor } from "./iguais";

/* 🔴 Mora em `utils/`, e não em `services/api/processos.ts`: é montagem
   de corpo de requisição, não chamada de API. Gêmeo de `corpoDoEndereco`
   em `utils/endereco.ts`. */

/** O corpo com os campos que quem chama REALMENTE tem.
 *
 * 🔴 **Campo ausente é OMITIDO, não zerado.** Escrever `campos.clienteIds ||
 * []` e `campos.observacoes || ""` para todos os nove faria do "PATCH" uma
 * sobrescrita total: qualquer campo que o formulário esquecesse de carregar
 * seria APAGADO ao salvar -- com `responsaveis` o servidor ao menos recusa
 * com 400; com `cliente_ids` apagaria calado.
 * ➡️ `CONTEXT.md`, "Histórias que saíram dos comentários", grupo 4.
 *
 * ⚠️ A convenção do servidor é a de PATCH parcial: `None` (campo ausente) =
 * "não enviei, não toque"; valor presente = "grave isto", inclusive vazio.
 * Esta função é o que faz o front honrar essa convenção.
 *
 * ⚠️ Vale para o POST de criação também, e ali é inofensivo: o formulário de
 * cadastro nasce com os nove campos preenchidos (string vazia, lista vazia),
 * então nenhum é omitido.
 */
export function corpoDosCamposDeProcesso(campos: CamposOpcionaisProcesso = {}) {
  const corpo: Record<string, unknown> = {};
  for (const [chave, nomeNaApi] of CAMPOS_DO_CORPO_DE_PROCESSO) {
    const valor = campos[chave];
    if (valor !== undefined) corpo[nomeNaApi] = valor;
  }
  return corpo;
}

/** Só o que MUDOU em relação ao processo que está gravado.
 *
 * 🔴 A rede de segurança de cima protege contra campo esquecido; esta função
 * ataca a causa: um salvamento não tem por que reenviar o que ninguém tocou.
 * Sem ela, dois pontos continuariam abertos:
 *
 * - **corrida entre duas pessoas** -- A abre o processo, B muda a situação, A
 *   salva o apelido e devolve a situação velha por cima, sem ter tocado nela;
 * - **permissão** -- reenviar a lista de responsáveis inalterada faz o
 *   servidor rodar a régua de "tirar OUTRA pessoa" à toa.
 *
 * ⚠️ Compara lista por CONTEÚDO e ordem. Reordenar sem acrescentar nem tirar
 * conta como mudança -- é o mais seguro dos dois erros: mandar de volta o que
 * já está lá é inócuo, deixar de mandar o que mudou perde a edição.
 */
export function camposAlterados(
  original: CamposOpcionaisProcesso,
  atual: CamposOpcionaisProcesso,
): CamposOpcionaisProcesso {
  const mudou: CamposOpcionaisProcesso = {};
  for (const [chave] of CAMPOS_DO_CORPO_DE_PROCESSO) {
    const antes = original[chave];
    const depois = atual[chave];
    if (depois === undefined) continue;
    if (!mesmoValor(antes, depois)) (mudou as Record<string, unknown>)[chave] = depois;
  }
  return mudou;
}
