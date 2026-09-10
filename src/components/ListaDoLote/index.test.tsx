/** A lista de títulos das confirmações do lote.
 *
 * 🔴 O que este arquivo trava: a confirmação diz QUAIS tarefas vão ser tocadas,
 * e não só quantas -- sem inventar "e mais 0" e sem empurrar o botão de
 * confirmar para fora da tela com 40 nomes.
 */
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import ListaDoLote from "./index";
import type { Tarefa } from "../../types";

function tarefa(i: number, extra: Partial<Tarefa> = {}): Tarefa {
  return {
    subgrupo_id: "s1", tarefa_id: `t${i}`, titulo: `Tarefa ${i}`,
    data: "2026-09-10", coluna_id: "c1", prioridade: "Média",
    ...extra,
  } as Tarefa;
}

describe("ListaDoLote", () => {
  it("diz QUAIS: os títulos, na ordem da tela", () => {
    renderComProviders(<ListaDoLote tarefas={[tarefa(1), tarefa(2)]} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent("Tarefa 1");
    expect(itens[1]).toHaveTextContent("Tarefa 2");
  });

  it("com processo mostra o número mascarado; sem processo diz isso", () => {
    renderComProviders(
      <ListaDoLote tarefas={[tarefa(1, { processo_numero: "08012345620268190001" }), tarefa(2)]} />,
    );
    const itens = screen.getAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("0801234-56.2026.8.19.0001");
    expect(itens[1]).toHaveTextContent("sem processo");
  });

  it("🔴 acima de três, mostra as três primeiras pelo nome e 'e mais N'", () => {
    /* Com 40 marcadas a lista inteira empurraria o botão de confirmar para fora
       da tela. */
    renderComProviders(<ListaDoLote tarefas={[1, 2, 3, 4, 5].map((i) => tarefa(i))} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Tarefa 3")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa 4")).not.toBeInTheDocument();
    expect(screen.getByText("e mais 2")).toBeInTheDocument();
  });

  it("⚠️ com exatamente três, não inventa 'e mais 0'", () => {
    renderComProviders(<ListaDoLote tarefas={[1, 2, 3].map((i) => tarefa(i))} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText(/e mais/)).not.toBeInTheDocument();
  });

  it("⚠️ com quatro, o resto é 1 -- a conta não erra por um", () => {
    renderComProviders(<ListaDoLote tarefas={[1, 2, 3, 4].map((i) => tarefa(i))} />);
    expect(screen.getByText("e mais 1")).toBeInTheDocument();
  });

  it("⚠️ sem tarefa nenhuma, não desenha uma lista vazia", () => {
    renderComProviders(<ListaDoLote tarefas={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("é uma lista de verdade para o leitor de tela", () => {
    renderComProviders(<ListaDoLote tarefas={[tarefa(1)]} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});
