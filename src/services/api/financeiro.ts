import { chamar } from "./client";
import type { OpcoesDePaginacao } from "../../types";
import type {
  CamposDaCategoria,
  CamposDaConta,
  DadosDaCategoria,
  DadosDaConta,
  DadosDoCentro,
} from "../../types/requisicoes";

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

/** A página N das contas, em ordem de nome -- a TELA de configuração.
 *
 * 🔴 Não substitui `lerCatalogoFinanceiro`: aquele traz as três listas
 * INTEIRAS e é o que popula os selects do formulário de lançamento. Paginar
 * ali seria paginar um dropdown. Duas leituras, dois donos.
 *
 * ⚠️ No servidor isto lê o índice estreito `GrupoOrdemIndex`, e não a
 * partição inteira -- é o mecanismo do `api/PLANO_PAGINACAO.md`.
 */
export function listarContas({ pagina, tamanhoPagina }: OpcoesDePaginacao = {}) {
  return chamar("/financeiro/contas", {
    query: {
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

/** Gêmea de `listarContas`.
 *
 * ⚠️ **Não existe `listarCategorias`**, e não é esquecimento: a ordem das
 * categorias é hierárquica (filha logo abaixo da mãe, indentada na tela) e a
 * quebra de página separaria as duas. A lista delas vem inteira. */
export function listarCentrosDeCusto({ pagina, tamanhoPagina }: OpcoesDePaginacao = {}) {
  return chamar("/financeiro/centros-de-custo", {
    query: {
      pagina: pagina ? String(pagina) : undefined,
      tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined,
    },
  });
}

export function criarConta(dados: DadosDaConta) {
  return chamar("/financeiro/contas", { method: "POST", body: { ...dados } });
}

/** Nome e dados bancários -- e SÓ eles.
 *
 * 🔴 `tipo`, `inicio` e `saldo_inicial_centavos` respondem **422 "Campo não
 * reconhecido"**: o tipo muda quais campos são obrigatórios num item que já
 * existe, e os outros dois são write-once porque o saldo ATUAL é mantido a
 * partir deles. A assinatura diz isso para o erro não precisar acontecer. */
export function atualizarConta(contaId: string, campos: CamposDaConta) {
  return chamar(`/financeiro/contas/${contaId}`, { method: "PATCH", body: { ...campos } });
}

export function criarCategoria(dados: DadosDaCategoria) {
  return chamar("/financeiro/categorias", { method: "POST", body: { ...dados } });
}

/** Nome, cor e agrupador.
 *
 * 🔴 `natureza` responde **422**: trocá-la inverteria o LADO do caixa de
 * tudo que já foi lançado nessa categoria. Quem errou desativa e cria de
 * novo. */
export function atualizarCategoria(categoriaId: string, campos: CamposDaCategoria) {
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
