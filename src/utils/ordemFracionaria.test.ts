import { describe, expect, it } from "vitest";

import { calcularOrdemAposMover } from "./ordemFracionaria";

/** O helper só olha `ordem` -- é genérico sobre `{ ordem }` justamente pra
 * servir às duas listas arrastáveis (opções de processo e colunas do
 * quadro). O teste reflete isso. */
function item(ordem: number) {
  return { ordem };
}

describe("calcularOrdemAposMover", () => {
  it("com os dois vizinhos, usa o ponto médio", () => {
    // É o que permite gravar só o item movido: qualquer valor entre os
    // vizinhos serve, e o ponto médio é o que aguenta mais arrastadas
    // seguidas antes de esbarrar na precisão do float.
    expect(calcularOrdemAposMover(item(1), item(3))).toBe(2);
  });

  it("movido pro início (sem vizinho anterior), usa o seguinte - 1", () => {
    expect(calcularOrdemAposMover(undefined, item(5))).toBe(4);
  });

  it("movido pro fim (sem vizinho seguinte), usa o anterior + 1", () => {
    expect(calcularOrdemAposMover(item(5), undefined)).toBe(6);
  });

  it("lista vazia (sem nenhum vizinho), usa 1", () => {
    expect(calcularOrdemAposMover(undefined, undefined)).toBe(1);
  });
});
