import { chamar } from "./client";

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
 * Os dois campos são independentes -- salvar o nome não reenvia o prazo, e
 * vice-versa. Mandar os dois sempre faria um "Salvar" do nome sobrescrever
 * um prazo que outra pessoa acabou de alterar. */
export function atualizarConfiguracoesDoGrupo(campos: {
  nome?: string;
  dias_para_arquivar?: number;
}) {
  return chamar("/grupos/configuracoes", { method: "PATCH", body: { ...campos } });
}
