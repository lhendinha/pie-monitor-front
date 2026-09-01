import { chamar } from "./client";
import type { InscricaoAvulsaParaSalvar } from "../../types";

/** Configurações do PRÓPRIO grupo de quem está pedindo.
 *
 * Não leva `grupo_id`: o servidor tira do contexto, e é isso que impede
 * pedir a configuração de outro grupo mesmo sabendo o id dele.
 */
export function lerConfiguracoesDoGrupo() {
  return chamar("/grupos/configuracoes");
}

/** PATCH parcial: manda só o que mudou.
 *
 * Os campos são independentes -- salvar o nome não reenvia o prazo, e
 * vice-versa. Mandar os dois sempre faria um "Salvar" do nome sobrescrever
 * um prazo que outra pessoa acabou de alterar.
 *
 * 🔴 **`oabs_avulsas` é a exceção, e ela SUBSTITUI a lista inteira.** Não
 * existe "adicionar uma": o servidor recebe a lista fechada, normaliza e
 * grava. Quem mandar a lista sem uma inscrição a está REMOVENDO -- por isso
 * `InscricoesDoGrupo` relê antes de montar o corpo. */
export function atualizarConfiguracoesDoGrupo(campos: {
  nome?: string;
  dias_para_arquivar?: number;
  oabs_avulsas?: InscricaoAvulsaParaSalvar[];
}) {
  return chamar("/grupos/configuracoes", { method: "PATCH", body: { ...campos } });
}
