import { chamar } from "./client";
import type { EscopoDaSerie, FiltrosDeLancamentos } from "../../types";
import type {
  CamposDoLancamento,
  DadosDaTransferencia,
  DadosDoLancamento,
} from "../../types/requisicoes";

/** Os lançamentos do escritório: o que entrou, o que saiu e o que ainda vai.
 *
 * ⚠️ Aqui só entram CHAMADAS. O que formata dinheiro mora em `utils/dinheiro`
 * e o que traduz período em datas, em `utils/periodo`.
 *
 * ➡️ `pages/FinanceiroPage`.
 */

export function listarLancamentos({
  pagina, tamanhoPagina, vencendo, ...filtros
}: FiltrosDeLancamentos = {}) {
  return chamar("/lancamentos", {
    query: {
      ...filtros,
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
      vencendo: vencendo ? String(vencendo) : undefined,
    },
  });
}

/** Quantas parcelas ABERTAS vêm depois desta, na mesma série.
 *
 * 🔴 É o número que o diálogo mostra antes de perguntar "este e os
 * próximos?" -- e é o que faz a pergunta NÃO aparecer quando não há o que
 * alcançar (lançamento avulso, ou a última parcela). Perguntar no vazio pede
 * uma decisão que não muda nada.
 *
 * ⚠️ Rota própria, e não um campo do detalhe: do lado do servidor isto custa
 * uma Query no índice dos abertos, e a maioria dos lançamentos não é série.
 */
export function contarASerie(lancamentoId: string) {
  return chamar(`/lancamentos/${lancamentoId}/serie`);
}

export function detalheLancamento(lancamentoId: string) {
  return chamar(`/lancamentos/${lancamentoId}`);
}

/** Um honorário, com `parcelas` para nascer em série mês a mês.
 *
 * ⚠️ `valor_centavos` é o de CADA parcela, nunca o total dividido -- é isso
 * que elimina o centavo de sobra. O rateio também é o de cada parcela. */
export function criarHonorario(dados: DadosDoLancamento, parcelas = 1) {
  return chamar("/lancamentos/honorarios", { method: "POST", body: { ...dados, parcelas } });
}

/** ⚠️ `repetir` cria os DOZE próximos meses de uma vez -- é o aluguel, a
 * assinatura, o que não acaba. Honorário não usa: parcela acaba. */
export function criarEntrada(dados: DadosDoLancamento, repetir = false) {
  return chamar("/lancamentos/entradas", { method: "POST", body: { ...dados, repetir } });
}

export function criarSaida(dados: DadosDoLancamento, repetir = false) {
  return chamar("/lancamentos/saidas", { method: "POST", body: { ...dados, repetir } });
}

export function criarTransferencia(dados: DadosDaTransferencia) {
  return chamar("/lancamentos/transferencias", { method: "POST", body: { ...dados } });
}

/** Edita este, ou este e os irmãos abertos à frente.
 *
 * 🔴 `escopo=futuros` copia os campos para os irmãos da série -- inclusive o
 * rateio e o valor. Num avulso, ou no último da série, não há irmão e o
 * escopo é ignorado. */
export function atualizarLancamento(
  lancamentoId: string,
  campos: CamposDoLancamento,
  escopo: EscopoDaSerie = "este",
) {
  return chamar(`/lancamentos/${lancamentoId}`, {
    method: "PATCH",
    query: { escopo },
    body: { ...campos },
  });
}

/** Marca como recebido ou pago, movendo o saldo da conta no mesmo ato.
 *
 * ⚠️ Data vazia = hoje. Efetivação no FUTURO não existe: o saldo da conta é
 * o de hoje, e somar dinheiro que ainda não entrou faria o extrato mentir. */
export function efetivarLancamento(lancamentoId: string, dataEfetivacao = "") {
  return chamar(`/lancamentos/${lancamentoId}/efetivar`, {
    method: "POST",
    body: { data_efetivacao: dataEfetivacao },
  });
}

/** Desfaz a efetivação e devolve o saldo. */
export function reabrirLancamento(lancamentoId: string) {
  return chamar(`/lancamentos/${lancamentoId}/reabrir`, { method: "POST" });
}

/** ⚠️ Nível `admin`+, ao contrário do resto do módulo: apagar dinheiro já
 * lançado é o único caminho sem volta daqui. */
export function excluirLancamento(lancamentoId: string, escopo: EscopoDaSerie = "este") {
  return chamar(`/lancamentos/${lancamentoId}`, { method: "DELETE", query: { escopo } });
}
