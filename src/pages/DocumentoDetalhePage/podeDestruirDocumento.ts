import { getEmail, papelAtende } from "../../services";
import type { Documento } from "../../types";

/** Se esta pessoa pode DESTRUIR este documento -- excluir ou trocar o arquivo.
 *
 * Não é permissão de tela só: é o espelho da regra do servidor
 * (`documentos_service._garantir_pode_destruir`). `manager`+ destrói
 * qualquer um; abaixo disso, só quem adicionou.
 *
 * 🔴 **Mais apertado que tarefa e atendimento de propósito**, e a diferença é
 * o que se perde: apagar uma tarefa apaga uma linha; apagar um documento
 * destrói o **arquivo**, e o bucket não tem versionamento -- não há de onde
 * restaurar.
 *
 * ⚠️ **Vale pros DOIS botões.** "Substituir" apaga o objeto antigo do mesmo
 * jeito; esconder só o "Excluir" deixaria a porta irmã aberta -- e a de
 * substituir nem passa por diálogo de confirmação.
 *
 * ⚠️ `criado_por` vazio (documento antigo, ou semeado direto no banco) cai
 * pro lado RESTRITIVO, como no servidor. Sem o teste de vazio, um `getEmail()`
 * nulo comparado a `""` passaria -- mesma armadilha já escrita em
 * `podeExcluirSubgrupo`.
 *
 * ⚠️ Esconder o botão **não** é a proteção: quem manda é a rota. É pra não
 * oferecer o que a API vai negar -- botão que existe e falha em 403 é pior
 * que botão ausente, porque a pessoa tenta, espera, e recebe uma recusa que
 * parece defeito.
 */
export function podeDestruirDocumento(documento: Documento): boolean {
  if (papelAtende("manager")) return true;
  return Boolean(documento.criado_por) && documento.criado_por === getEmail();
}
