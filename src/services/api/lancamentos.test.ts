import { beforeEach, describe, expect, it, vi } from "vitest";

/* A assinatura vai explícita: `vi.fn(async () => …)` infere ZERO parâmetros,
   e aí ler `mock.calls[0][1]` não compila. */
const mocks = vi.hoisted(() => ({
  chamar: vi.fn(async (
    _caminho: string,
    _opcoes?: { method?: string; query?: Record<string, unknown>; body?: Record<string, unknown> },
  ) => ({})),
}));
vi.mock("./client", () => mocks);

import {
  atualizarLancamento,
  criarHonorario,
  efetivarLancamento,
  excluirLancamento,
  listarLancamentos,
} from "./lancamentos";

/** O que sai no fio.
 *
 * 🔴 Existe pelo mesmo motivo de `subgrupos.test.ts`: o teste da TELA dubla
 * `listarLancamentos` inteiro e prova que ela pede o período -- nunca que a
 * função o transforma em `?de=&ate=` na URL. Parâmetro de query ausente é só
 * "não pediu" para o servidor, e a lista voltaria com o ano inteiro sem nada
 * acusar.
 */
function caminho() {
  return mocks.chamar.mock.calls[0][0];
}
function opcoes() {
  return mocks.chamar.mock.calls[0][1] ?? {};
}
function query() {
  return (opcoes().query ?? {}) as Record<string, unknown>;
}

beforeEach(() => vi.clearAllMocks());

describe("listarLancamentos", () => {
  it("o período vai como `de` e `ate`", async () => {
    await listarLancamentos({ de: "2026-09-01", ate: "2026-09-30" });
    expect(query()).toMatchObject({ de: "2026-09-01", ate: "2026-09-30" });
  });

  it("🔴 'todos os períodos' manda SEM as duas pontas", async () => {
    /* Mandar string vazia não é a mesma coisa: a API leria `de=""` como uma
       data inválida em vez de "sem limite". */
    await listarLancamentos({ pagina: 1 });
    expect(query().de).toBeUndefined();
    expect(query().ate).toBeUndefined();
  });

  it("a paginação vira `pagina` e `tamanho_pagina`", async () => {
    await listarLancamentos({ pagina: 3, tamanhoPagina: 30 });
    expect(query()).toMatchObject({ pagina: "3", tamanho_pagina: "30" });
  });

  it("⚠️ página 1 e tamanho padrão continuam indo quando pedidos", async () => {
    /* O par do de cima: só o AUSENTE some. Um `pagina: 1` explícito é uma
       escolha da tela, e apagá-lo aqui esconderia um estado real. */
    await listarLancamentos({ pagina: 1, tamanhoPagina: 10 });
    expect(query()).toMatchObject({ pagina: "1", tamanho_pagina: "10" });
  });

  it("🔴 `subgrupo_id` é o DEPARTAMENTO, e vai como veio", async () => {
    await listarLancamentos({ subgrupo_id: "dep-civel" });
    expect(query().subgrupo_id).toBe("dep-civel");
  });

  it("`vencendo` vira número em texto -- é o card da Área de trabalho", async () => {
    await listarLancamentos({ vencendo: 7 });
    expect(query().vencendo).toBe("7");
  });

  it("⚠️ `vencendo` ZERO não vai: zero dias não é um pedido", async () => {
    await listarLancamentos({ vencendo: 0 });
    expect(query().vencendo).toBeUndefined();
  });
});

describe("criarHonorario", () => {
  it("manda o rateio e as parcelas no corpo", async () => {
    await criarHonorario({
      descricao: "Contestação", valor_centavos: 800000, data_vencimento: "2026-09-20",
      conta_id: "c1", categoria_id: "cat1", rateio: [{ subgrupo_id: "dep" }],
    }, 3);
    expect(caminho()).toBe("/lancamentos/honorarios");
    expect(opcoes().body).toMatchObject({
      valor_centavos: 800000, parcelas: 3, rateio: [{ subgrupo_id: "dep" }],
    });
  });

  it("⚠️ sem parcelas, manda 1 -- e não omite", async () => {
    /* Omitir deixaria o padrão para a API decidir, e a tela deixaria de
       dizer o que quis. */
    await criarHonorario({
      descricao: "x", valor_centavos: 100, data_vencimento: "2026-09-20",
      conta_id: "c1", categoria_id: "cat1", rateio: [{ subgrupo_id: "dep" }],
    });
    expect(opcoes().body).toMatchObject({ parcelas: 1 });
  });
});

describe("atualizarLancamento", () => {
  it("o escopo vai na URL, e o corpo leva só o que mudou", async () => {
    await atualizarLancamento("l1", { descricao: "Outro" }, "futuros");
    expect(caminho()).toBe("/lancamentos/l1");
    expect(opcoes().method).toBe("PATCH");
    expect(query().escopo).toBe("futuros");
    expect(opcoes().body).toEqual({ descricao: "Outro" });
  });

  it("⚠️ o padrão é 'este' -- mexer nos irmãos é escolha explícita", async () => {
    await atualizarLancamento("l1", { descricao: "Outro" });
    expect(query().escopo).toBe("este");
  });
});

describe("efetivar e excluir", () => {
  it("efetivar com data vazia deixa a API usar hoje", async () => {
    await efetivarLancamento("l1");
    expect(opcoes().body).toEqual({ data_efetivacao: "" });
  });

  it("excluir leva o escopo, como o PATCH", async () => {
    await excluirLancamento("l1", "futuros");
    expect(opcoes().method).toBe("DELETE");
    expect(query().escopo).toBe("futuros");
  });
});
