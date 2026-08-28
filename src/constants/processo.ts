import type { CamposOpcionaisProcesso } from "../types";

/** Os campos opcionais do processo, pareados com o nome que a API usa.
 *
 * 🔴 É a fonte única de "quais campos o corpo carrega". `corpoDosCamposDeProcesso`
 * monta o JSON a partir daqui e `camposAlterados` compara a partir daqui --
 * duas listas separadas divergiriam no primeiro campo novo, e o sintoma seria
 * uma edição que some sem erro nenhum.
 *
 * ⚠️ A ordem é a que a tela mostra: identificação, partes, classificação,
 * prazos, anotações. Ela não muda comportamento, mas é o que faz ler o corpo
 * da requisição parecer ler o formulário.
 */
export const CAMPOS_DO_CORPO_DE_PROCESSO: Array<[keyof CamposOpcionaisProcesso, string]> = [
  ["clienteIds", "cliente_ids"],
  ["responsaveis", "responsaveis"],
  ["objetoAssunto", "objeto_assunto"],
  ["proximaProvidencia", "proxima_providencia"],
  ["dataVerificar", "data_verificar"],
  ["prazoFinal", "prazo_final"],
  ["observacoes", "observacoes"],
  ["faseId", "fase_id"],
  ["situacaoId", "situacao_id"],
];
