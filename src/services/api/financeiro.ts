import { chamar } from "./client";
import type { DadosDaCategoria, DadosDaConta, DadosDoCentro } from "../../types/requisicoes";

/** O catálogo do Financeiro: contas, categorias e centros de custo.
 *
 * 🔴 Uma leitura só devolve as três listas. É uma Query no servidor, e a
 * tela precisa das três para montar qualquer formulário de lançamento --
 * três chamadas seriam três estados de carregamento para uma tela só.
 *
 * ⚠️ Ler é `financeiro`+; escrever é `admin`+. A tela mostra o catálogo a
 * quem é do Financeiro e esconde os botões de quem não pode escrever, mas
 * quem manda a chamada mesmo assim recebe 403 do servidor.
 *
 * ➡️ `pages/FinanceiroPage/components/ConfiguracoesFinanceiras`.
 */
export function lerCatalogoFinanceiro() {
  return chamar("/financeiro/catalogo");
}

export function criarConta(dados: DadosDaConta) {
  return chamar("/financeiro/contas", { method: "POST", body: { ...dados } });
}

/** 🔴 Só o NOME, e a assinatura diz isso: o `PATCH` do catálogo é
 * `RenomearItemRequest` com `extra="forbid"`, e mandar `tipo` junto responde
 * **422 "tipo: Campo não reconhecido"** -- medido contra a API.
 *
 * `Partial<DadosDaConta>` era largo demais e convidava exatamente esse erro.
 * O saldo, em particular, é mantido pela API a cada baixa; um PATCH que o
 * reescrevesse desfaria a história em silêncio, e quem precisa corrigir usa
 * o script de reconciliação. */
export function atualizarConta(contaId: string, campos: { nome: string }) {
  return chamar(`/financeiro/contas/${contaId}`, { method: "PATCH", body: { ...campos } });
}

export function criarCategoria(dados: DadosDaCategoria) {
  return chamar("/financeiro/categorias", { method: "POST", body: { ...dados } });
}

export function atualizarCategoria(categoriaId: string, campos: { nome: string }) {
  return chamar(`/financeiro/categorias/${categoriaId}`, {
    method: "PATCH",
    body: { ...campos },
  });
}

export function criarCentroDeCusto(dados: DadosDoCentro) {
  return chamar("/financeiro/centros-de-custo", { method: "POST", body: { ...dados } });
}

export function atualizarCentroDeCusto(centroId: string, campos: { nome: string }) {
  return chamar(`/financeiro/centros-de-custo/${centroId}`, {
    method: "PATCH",
    body: { ...campos },
  });
}

/** ⚠️ `POST .../desativar`, e não `DELETE`: é soft-delete, e o item
 * continua existindo para os lançamentos que já o usam. Um `DELETE` que
 * deixa o item vivo mentiria sobre o que fez. */
export function desativarItemFinanceiro(recurso: string, itemId: string) {
  return chamar(`/financeiro/${recurso}/${itemId}/desativar`, { method: "POST" });
}

export function reativarItemFinanceiro(recurso: string, itemId: string) {
  return chamar(`/financeiro/${recurso}/${itemId}/reativar`, { method: "POST" });
}
