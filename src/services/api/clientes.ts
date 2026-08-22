import { chamar } from "./client";

interface CamposCliente {
  nome: string;
  cpfCnpj?: string;
  telefone?: string;
  email?: string;
}

interface OpcoesListarClientes {
  pagina?: number;
  tamanhoPagina?: number;
  busca?: string;
}

/** GET /clientes -- paginado de verdade. `CamposProcesso` (dropdown de
 * Cliente no processo) pede `tamanhoPagina: 100` pra cobrir a lista
 * inteira em vez de paginar de verdade. Se `busca` vier preenchido, ignora
 * pagina/tamanhoPagina -- é uma busca pontual, não paginada (mesmo corte
 * que clientes_router.py usa). */
export function listarClientes(opcoes: OpcoesListarClientes = {}) {
  const { pagina, tamanhoPagina, busca } = opcoes;
  const query: Record<string, string | undefined> = busca
    ? { busca }
    : { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined };
  return chamar("/clientes", { query });
}

/** Um cliente por id -- é o que hidrata a página de detalhe num F5 ou num
 * link colado. Devolve também `processos`, a contagem derivada. */
export function detalheCliente(clienteId: string) {
  return chamar(`/clientes/${clienteId}`);
}

export function criarCliente(campos: CamposCliente) {
  return chamar("/clientes", {
    method: "POST",
    body: { nome: campos.nome, cpf_cnpj: campos.cpfCnpj || "", telefone: campos.telefone || "", email: campos.email || "" },
  });
}

export function atualizarCliente(clienteId: string, campos: CamposCliente) {
  return chamar(`/clientes/${clienteId}`, {
    method: "PATCH",
    body: { nome: campos.nome, cpf_cnpj: campos.cpfCnpj || "", telefone: campos.telefone || "", email: campos.email || "" },
  });
}

export function removerCliente(clienteId: string) {
  return chamar(`/clientes/${clienteId}`, { method: "DELETE" });
}
