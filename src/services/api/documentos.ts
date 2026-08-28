import { chamar } from "./client";
import type { CamposDeDocumento, Documento, EnvioPreparado, FiltrosDeDocumentos } from "../../types";

/** `GET /documentos`, escopado aos subgrupos que a pessoa enxerga.
 *
 * A MESMA rota serve a tela geral e as abas dentro de processo, cliente e
 * atendimento -- o que muda é o filtro de vínculo. Sem esses filtros, cada
 * aba teria que paginar a lista inteira do grupo e peneirar no navegador.
 */
export function listarDocumentos(filtros: FiltrosDeDocumentos = {}) {
  const { busca, processoNumero, atendimentoId, clienteId, subgrupoId, pagina, tamanhoPagina } =
    filtros;
  return chamar("/documentos", {
    query: {
      busca,
      processo_numero: processoNumero,
      atendimento_id: atendimentoId,
      cliente_id: clienteId,
      subgrupo_id: subgrupoId,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

export function detalhesDocumento(subgrupoId: string, documentoId: string) {
  return chamar<Documento>(`/subgrupos/${subgrupoId}/documentos/${documentoId}`);
}

/** Passo 1 do envio: a permissão de gravar. **Não cria documento nenhum.**
 *
 * `content_type` é o que o navegador declara sobre o arquivo. Vai porque sem
 * ele o objeto fica `binary/octet-stream` no armazenamento; continua sendo
 * declaração, e nada na tela decide nada com base nele.
 */
export function prepararEnvio(subgrupoId: string, contentType: string) {
  return chamar<EnvioPreparado>(`/subgrupos/${subgrupoId}/documentos/upload`, {
    method: "POST",
    body: { content_type: contentType },
  });
}

/** Passo 2: o arquivo vai DIRETO do navegador pro armazenamento.
 *
 * 🔴 **Não passa pela API, e não é otimização.** O payload síncrono de um
 * Lambda para em 6 MB -- request e response --, e o teto de arquivo aqui é
 * 20 MB. Pela API, todo arquivo acima de 6 MB falharia com um erro de
 * gateway que não menciona tamanho.
 *
 * ⚠️ **`fetch` sem `Content-Type` nosso**, e sem o `Authorization` do
 * `chamar`. O `FormData` precisa que o navegador escreva o cabeçalho
 * `multipart/form-data` COM o `boundary` que ele mesmo gerou; escrever o
 * cabeçalho à mão apaga o boundary e o armazenamento não consegue separar os
 * campos. E o token do Argos não tem o que fazer num pedido que não é pra
 * nós -- quem autoriza é a assinatura que já vai dentro de `campos`.
 *
 * ⚠️ **`campos` vai ANTES do arquivo.** Numa política de POST o arquivo tem
 * que ser o último campo do formulário: o armazenamento para de ler quando o
 * encontra, e qualquer campo depois dele é ignorado -- inclusive a
 * assinatura.
 */
export async function enviarArquivo(envio: EnvioPreparado, arquivo: File): Promise<void> {
  const formulario = new FormData();
  Object.entries(envio.campos).forEach(([chave, valor]) => formulario.append(chave, valor));
  formulario.append("file", arquivo);

  const resposta = await fetch(envio.url, { method: "POST", body: formulario });
  if (!resposta.ok) {
    // O corpo é um XML de erro do S3, ilegível pra quem está enviando um
    // contrato. A mensagem aqui é a que a pessoa vê -- e diz o que ela pode
    // fazer, que é tentar de novo com o formulário ainda preenchido.
    throw new Error(
      resposta.status === 403
        ? "O envio expirou ou o arquivo passa do tamanho permitido. Tente de novo."
        : "Não foi possível enviar o arquivo. Tente de novo.",
    );
  }
}

/** Passo 3 do arquivo, e passo único do link -- a mesma rota pros dois.
 *
 * 🔴 O registro nasce AQUI, depois de o arquivo já estar no armazenamento.
 * A ordem inversa (registro primeiro, arquivo depois) obrigaria a um estado
 * "envio incompleto" na tela, com botão de reenviar e rota de confirmar --
 * tudo pra cobrir uma janela que só existe porque o registro foi criado cedo
 * demais.
 */
export function criarDocumento(subgrupoId: string, dados: CamposDeDocumento) {
  return chamar(`/subgrupos/${subgrupoId}/documentos`, { method: "POST", body: { ...dados } });
}

/** PATCH parcial: campo omitido não é tocado.
 *
 * ⚠️ **`nome_arquivo` não entra aqui**, e é decisão do servidor também: ele é
 * o nome com que o arquivo baixa. Quem quer outro arquivo usa `substituir`,
 * que troca o objeto junto. Editar o `titulo` não mexe nele.
 */
export function atualizarDocumento(
  subgrupoId: string,
  documentoId: string,
  campos: {
    titulo?: string;
    descricao?: string;
    url?: string;
    processo_numero?: string | null;
    atendimento_id?: string | null;
    cliente_ids?: string[];
    responsavel_id?: string | null;
  },
) {
  return chamar(`/subgrupos/${subgrupoId}/documentos/${documentoId}`, {
    method: "PATCH",
    body: { ...campos },
  });
}

/** Troca o arquivo de um documento que já existe. Mesmos passos 1 e 2 antes.
 *
 * O objeto antigo só é apagado depois que o registro aponta pro novo.
 */
export function substituirArquivo(
  subgrupoId: string,
  documentoId: string,
  chave: string,
  nomeArquivo: string,
) {
  return chamar(`/subgrupos/${subgrupoId}/documentos/${documentoId}/substituir`, {
    method: "POST",
    body: { chave, nome_arquivo: nomeArquivo },
  });
}

/** A URL de download, não o arquivo.
 *
 * Vale um minuto e já carrega o nome original no `Content-Disposition`.
 * Devolver o conteúdo pela API esbarraria no mesmo teto de 6 MB do envio.
 */
export function linkDeDownload(subgrupoId: string, documentoId: string) {
  return chamar<{ url: string }>(
    `/subgrupos/${subgrupoId}/documentos/${documentoId}/download`,
  );
}

/** 🔴 Apaga o ARQUIVO junto, e não tem de onde restaurar -- o bucket não tem
 * versionamento. Quem chama passa pelo diálogo de confirmação. */
export function removerDocumento(subgrupoId: string, documentoId: string) {
  return chamar(`/subgrupos/${subgrupoId}/documentos/${documentoId}`, { method: "DELETE" });
}
