import { describe, expect, it } from "vitest";

import { calcularOrdemAposMover } from "./opcoes";
import type { OpcaoProcesso } from "../../../types";

function opcao(ordem: number): OpcaoProcesso {
  return { tipo: "fase", opcao_id: `o${ordem}`, rotulo: `Opção ${ordem}`, ordem, ativo: true };
}

describe("calcularOrdemAposMover", () => {
  it("com os dois vizinhos, usa o ponto médio", () => {
    // É o que permite gravar só o item movido: qualquer valor entre os
    // vizinhos serve, e o ponto médio é o que aguenta mais arrastadas
    // seguidas antes de esbarrar na precisão do float.
    expect(calcularOrdemAposMover(opcao(1), opcao(3))).toBe(2);
  });

  it("movido pro início (sem vizinho anterior), usa o seguinte - 1", () => {
    expect(calcularOrdemAposMover(undefined, opcao(5))).toBe(4);
  });

  it("movido pro fim (sem vizinho seguinte), usa o anterior + 1", () => {
    expect(calcularOrdemAposMover(opcao(5), undefined)).toBe(6);
  });

  it("lista vazia (sem nenhum vizinho), usa 1", () => {
    expect(calcularOrdemAposMover(undefined, undefined)).toBe(1);
  });
});
