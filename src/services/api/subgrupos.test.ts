import { beforeEach, describe, expect, it, vi } from "vitest";

/* A assinatura vai explícita: `vi.fn(async () => …)` infere ZERO parâmetros,
   e aí ler `mock.calls[0][1]` não compila. */
const mocks = vi.hoisted(() => ({
  chamar: vi.fn(async (_caminho: string, _opcoes?: { query?: Record<string, unknown> }) => ({})),
}));
vi.mock("./client", () => mocks);

import { listarSubgrupos } from "./subgrupos";

/** O que sai no fio, para a listagem de subgrupos.
 *
 * 🔴 Irmão de `documentos.test.ts`, pela mesma razão: o teste da tela dubla
 * `listarSubgrupos` inteiro e prova que a aba PEDE `comContagens`, nunca que
 * a função o transforma em `com_contagens=true` na URL. Sem esta linha a
 * aba mostraria "0 membros" em toda linha, em silêncio -- parâmetro de query
 * ausente é só "não pediu" para o servidor.
 */
function queryEnviada() {
  return mocks.chamar.mock.calls[0][1]?.query as Record<string, unknown>;
}

beforeEach(() => vi.clearAllMocks());

describe("a contagem de membros só vai quando pedida", () => {
  it("🔴 `comContagens` vira `com_contagens=true` na URL", async () => {
    await listarSubgrupos({ pagina: 2, tamanhoPagina: 10, comContagens: true });
    expect(queryEnviada()).toMatchObject({ pagina: "2", tamanho_pagina: "10", com_contagens: "true" });
  });

  it("⚠️ sem pedir, o parâmetro NÃO vai -- o par negativo, que é o que os seletores fazem", async () => {
    await listarSubgrupos({ tamanhoPagina: 50, busca: "civ" });
    expect(queryEnviada().com_contagens).toBeUndefined();
    expect(queryEnviada().busca).toBe("civ");
  });

  it("`comContagens: false` também não vai", async () => {
    await listarSubgrupos({ comContagens: false });
    expect(queryEnviada().com_contagens).toBeUndefined();
  });
});
