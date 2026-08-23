import { chamar } from "./client";

/** Configurações do PRÓPRIO grupo de quem está pedindo.
 *
 * Não leva `grupo_id`: o servidor tira do contexto, e é isso que impede
 * pedir a configuração de outro grupo mesmo sabendo o id dele.
 */
export function lerConfiguracoesDoGrupo() {
  return chamar("/grupos/configuracoes");
}

export function atualizarConfiguracoesDoGrupo(diasParaArquivar: number) {
  return chamar("/grupos/configuracoes", {
    method: "PATCH",
    body: { dias_para_arquivar: diasParaArquivar },
  });
}
