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
}

/** GET /clientes -- paginado de verdade. `CamposProcesso` (dropdown de
 * Cliente no processo) pede `tamanhoPagina: 100` pra cobrir a lista
 * inteira em vez de paginar de verdade. */
export function listarClientes(opcoes: OpcoesListarClientes = {}) {
  const { pagina, tamanhoPagina } = opcoes;
  return chamar("/clientes", {
    query: { pagina: pagina ? String(pagina) : undefined, tamanho_pagina: tamanhoPagina ? String(tamanhoPagina) : undefined },
  });
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
