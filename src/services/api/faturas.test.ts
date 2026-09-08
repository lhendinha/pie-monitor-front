import { beforeEach, describe, expect, it, vi } from "vitest";

const chamar = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ chamar }));

import {
  cancelarFatura,
  detalheFatura,
  emitirFatura,
  lerFluxoDeCaixa,
  listarAFaturar,
  listarFaturas,
  pagarFatura,
} from "./faturas";

beforeEach(() => {
  vi.clearAllMocks();
  chamar.mockResolvedValue({});
});

describe("as rotas de fatura", () => {
  it("a faturar não leva parâmetro nenhum", async () => {
    await listarAFaturar();
    expect(chamar).toHaveBeenCalledWith("/faturas/a-faturar");
  });

  it("listar manda o período e a página quando eles existem", async () => {
    await listarFaturas({ de: "2026-09-01", ate: "2026-09-30", pagina: 3, tamanhoPagina: 20 });
    expect(chamar).toHaveBeenCalledWith("/faturas", {
      query: { de: "2026-09-01", ate: "2026-09-30", pagina: "3", tamanho_pagina: "20" },
    });
  });

  it("⚠️ e sem nada manda tudo vazio -- é o 'todos os períodos', primeira página", async () => {
    await listarFaturas();
    expect(chamar).toHaveBeenCalledWith("/faturas", {
      query: { de: undefined, ate: undefined, pagina: undefined, tamanho_pagina: undefined },
    });
  });

  it("🔴 a página vai em snake_case e como TEXTO -- é query string", async () => {
    /* `tamanhoPagina` é o nome do front; `tamanho_pagina` é o da API. Mandar
       o nome do front faria o servidor cair no padrão calado, e a barra
       mostraria 10 por página com 50 escolhidos. */
    await listarFaturas({ pagina: 2, tamanhoPagina: 50 });
    const chamadas = chamar.mock.calls;
    const [, opcoes] = chamadas[chamadas.length - 1] as [
      string,
      { query: Record<string, unknown> },
    ];
    expect(opcoes.query).not.toHaveProperty("tamanhoPagina");
    expect(opcoes.query.tamanho_pagina).toBe("50");
    expect(opcoes.query.pagina).toBe("2");
  });

  it("emitir vai com o corpo, por POST", async () => {
    await emitirFatura({
      cliente_id: "c1",
      lancamento_ids: ["l1", "l2"],
      data_vencimento: "2026-10-10",
    });
    expect(chamar).toHaveBeenCalledWith("/faturas", {
      method: "POST",
      body: { cliente_id: "c1", lancamento_ids: ["l1", "l2"], data_vencimento: "2026-10-10" },
    });
  });

  it("o detalhe é pelo id", async () => {
    await detalheFatura("f1");
    expect(chamar).toHaveBeenCalledWith("/faturas/f1");
  });

  it("🔴 pagar manda corpo VAZIO quando não se diz nada", async () => {
    /* Vazio = hoje, na conta prevista. É a régua do servidor, e mandar
       `{}` é diferente de não mandar corpo nenhum. */
    await pagarFatura("f1");
    expect(chamar).toHaveBeenCalledWith("/faturas/f1/pagar", { method: "POST", body: {} });
  });

  it("e leva a data e a conta quando alguém as escolhe", async () => {
    await pagarFatura("f1", { pago_em: "2026-10-05", conta_id: "ct2" });
    expect(chamar).toHaveBeenCalledWith("/faturas/f1/pagar", {
      method: "POST",
      body: { pago_em: "2026-10-05", conta_id: "ct2" },
    });
  });

  it("cancelar não leva corpo", async () => {
    await cancelarFatura("f1");
    expect(chamar).toHaveBeenCalledWith("/faturas/f1/cancelar", { method: "POST" });
  });
});

describe("o fluxo de caixa", () => {
  it("sem filtro, deixa o servidor escolher o ano corrente", async () => {
    await lerFluxoDeCaixa();
    expect(chamar).toHaveBeenCalledWith("/financeiro/fluxo-de-caixa", { query: {} });
  });

  it("⚠️ as pontas são MESES, não datas -- a tabela é mensal", async () => {
    await lerFluxoDeCaixa({ de: "2026-01", ate: "2026-12", centro_id: "cc1" });
    expect(chamar).toHaveBeenCalledWith("/financeiro/fluxo-de-caixa", {
      query: { de: "2026-01", ate: "2026-12", centro_id: "cc1" },
    });
  });
});
