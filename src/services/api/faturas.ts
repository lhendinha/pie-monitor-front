import { chamar } from "./client";
import type { DadosDaFatura, DadosDoPagamento } from "../../types/requisicoes";
import type { FiltrosDeFaturas, OpcoesDoFluxo } from "../../types";

/** As faturas do escritório e o fluxo de caixa.
 *
 * ⚠️ Aqui só entram CHAMADAS. O que monta o CSV mora em `utils/planilha`, e
 * o que soma as colunas da tela, em `utils/fluxoDeCaixa`.
 *
 * ➡️ `pages/FinanceiroPage`, abas Faturas e Fluxo de caixa.
 */

/** Os clientes com honorário ou despesa esperando cobrança.
 *
 * 🔴 Não é paginado, e não é descuido: a lista é "quem tem dinheiro a
 * faturar HOJE", que num escritório são poucos clientes -- e ela some da
 * tela conforme as faturas saem. */
export function listarAFaturar() {
  return chamar("/faturas/a-faturar");
}

/** As faturas já emitidas, do período.
 *
 * ⚠️ Sem `de`/`ate` traz todas -- é o "Todos os períodos" da pílula. */
/** A página de "Emitidas", filtrada pelo VENCIMENTO.
 *
 * 🔴 Paginada no servidor, pelo índice estreito: nenhuma fatura é apagada
 * -- paga e cancelada ficam --, então a lista só cresce. */
export function listarFaturas({ pagina, tamanhoPagina, ...filtros }: FiltrosDeFaturas = {}) {
  return chamar("/faturas", {
    query: {
      ...filtros,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

export function detalheFatura(faturaId: string) {
  return chamar(`/faturas/${faturaId}`);
}

/** Emite a fatura com os lançamentos escolhidos.
 *
 * 🔴 A despesa NÃO vira linha de cobrança: a emissão cria um RECEBÍVEL de
 * reembolso no valor dela e carimba a despesa como cobrada. Somá-la como
 * linha faria o total do documento não bater com o que o cliente deve. */
export function emitirFatura(dados: DadosDaFatura) {
  return chamar("/faturas", { method: "POST", body: dados });
}

/** Paga o documento INTEIRO -- não existe valor parcial, e mandar um é 422.
 *
 * ⚠️ Quem recebeu parte efetiva o lançamento sozinho, pela lista. */
export function pagarFatura(faturaId: string, dados: DadosDoPagamento = {}) {
  return chamar(`/faturas/${faturaId}/pagar`, { method: "POST", body: dados });
}

/** Cancela a fatura e devolve os lançamentos dela para "a faturar". */
export function cancelarFatura(faturaId: string) {
  return chamar(`/faturas/${faturaId}/cancelar`, { method: "POST" });
}

/** O fluxo de caixa, mês a mês.
 *
 * ⚠️ Sem `de`/`ate` a API devolve o ANO corrente, que é o padrão da tela.
 * As pontas são MESES (`aaaa-mm`), não datas -- a tabela é mensal. */
export function lerFluxoDeCaixa(opcoes: OpcoesDoFluxo = {}) {
  return chamar("/financeiro/fluxo-de-caixa", { query: { ...opcoes } });
}
