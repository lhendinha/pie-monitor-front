import { describe, expect, it } from "vitest";

import type { Tarefa } from "../../../types";
import { agruparPorDia } from "./tarefasPorDia";

function tarefa(parcial: Partial<Tarefa>): Tarefa {
  return {
    subgrupo_id: "s1",
    tarefa_id: Math.random().toString(36).slice(2),
    titulo: "Tarefa",
    data: "2026-08-19",
    coluna_id: "c1",
    prioridade: "Média",
    ...parcial,
  };
}

describe("agruparPorDia", () => {
  it("separa por data", () => {
    const porDia = agruparPorDia([
      tarefa({ data: "2026-08-19", titulo: "A" }),
      tarefa({ data: "2026-08-20", titulo: "B" }),
      tarefa({ data: "2026-08-19", titulo: "C" }),
    ]);
    expect(porDia.get("2026-08-19")?.map((t) => t.titulo)).toEqual(["A", "C"]);
    expect(porDia.get("2026-08-20")?.map((t) => t.titulo)).toEqual(["B"]);
  });

  it("dia sem tarefa simplesmente não está no mapa", () => {
    expect(agruparPorDia([]).get("2026-08-19")).toBeUndefined();
  });

  it("ordena por prioridade: Alta no topo", () => {
    const porDia = agruparPorDia([
      tarefa({ titulo: "baixa", prioridade: "Baixa" }),
      tarefa({ titulo: "alta", prioridade: "Alta" }),
      tarefa({ titulo: "media", prioridade: "Média" }),
    ]);
    expect(porDia.get("2026-08-19")?.map((t) => t.titulo)).toEqual(["alta", "media", "baixa"]);
  });

  it("prioridade desconhecida vai pro FIM, não pro topo", () => {
    // Um valor novo no servidor não pode empurrar o resto pra baixo.
    const porDia = agruparPorDia([
      tarefa({ titulo: "nova", prioridade: "Urgentíssima" }),
      tarefa({ titulo: "baixa", prioridade: "Baixa" }),
    ]);
    expect(porDia.get("2026-08-19")?.map((t) => t.titulo)).toEqual(["baixa", "nova"]);
  });

  it("desempata por título, pra lista não piscar entre renders", () => {
    const porDia = agruparPorDia([
      tarefa({ titulo: "Zebra", prioridade: "Alta" }),
      tarefa({ titulo: "Alface", prioridade: "Alta" }),
    ]);
    expect(porDia.get("2026-08-19")?.map((t) => t.titulo)).toEqual(["Alface", "Zebra"]);
  });

  it("ignora tarefa sem data em vez de criar uma chave vazia", () => {
    const porDia = agruparPorDia([tarefa({ data: "" })]);
    expect(porDia.size).toBe(0);
  });
});
