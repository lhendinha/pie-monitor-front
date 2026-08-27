import type { EnderecoDoCep } from "../../types";
import { chamar } from "./client";

/** `GET /cep/{cep}` -- a NOSSA rota, não o provedor.
 *
 * 🔴 E isso não é preferência: o `connect-src` do CSP (`vercel.json`) lista
 * `'self'`, a Lambda URL, o WebSocket e o bucket. `viacep.com.br` não está
 * lá, então chamar o provedor direto daqui é bloqueado pelo navegador.
 *
 * A resposta já vem traduzida, com `cep` SEM máscara -- o front não sabe (nem
 * deve saber) qual provedor respondeu.
 *
 * ⚠️ Espera só DÍGITOS. Quem chama aplica `apenasDigitos` antes; mandar o
 * valor mascarado daria 400.
 */
export function consultarCep(cepSoDigitos: string): Promise<EnderecoDoCep> {
  return chamar(`/cep/${cepSoDigitos}`) as Promise<EnderecoDoCep>;
}
