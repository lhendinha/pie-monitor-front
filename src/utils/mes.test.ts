import { describe, expect, it, vi, beforeEach } from "vitest";

import { formatarMes, mesDeHoje, mesesDoIntervalo, mesesEntre, opcoesDeMes, somarMeses } from "./mes";

beforeEach(() => {
  vi.setSystemTime(new Date("2026-09-08T12:00:00"));
});

describe("somarMeses", () => {
  it("anda para a frente e para trás", () => {
    expect(somarMeses("2026-03", 1)).toBe("2026-04");
    expect(somarMeses("2026-03", -1)).toBe("2026-02");
  });

  it("🔴 vira o ano nos dois sentidos", () => {
    /* A conta na mão erra exatamente aqui, uma vez por ano. */
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
    expect(somarMeses("2026-05", 10)).toBe("2027-03");
    expect(somarMeses("2026-05", -17)).toBe("2024-12");
  });

  it("somar zero devolve o mesmo mês", () => {
    expect(somarMeses("2026-07", 0)).toBe("2026-07");
  });
});

describe("mesesEntre", () => {
  it("conta as DUAS pontas -- é a régua do teto de 24 do servidor", () => {
    expect(mesesEntre("2026-01", "2026-01")).toBe(1);
    expect(mesesEntre("2026-01", "2026-12")).toBe(12);
    expect(mesesEntre("2025-01", "2026-12")).toBe(24);
    expect(mesesEntre("2025-01", "2027-01")).toBe(25);
  });

  it("invertido dá número não positivo -- quem valida é quem chama", () => {
    expect(mesesEntre("2026-12", "2026-01")).toBeLessThanOrEqual(0);
  });
});

describe("mesesDoIntervalo", () => {
  it("lista do primeiro ao último, inclusive", () => {
    expect(mesesDoIntervalo("2026-11", "2027-02"))
      .toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("uma ponta só devolve um mês", () => {
    expect(mesesDoIntervalo("2026-05", "2026-05")).toEqual(["2026-05"]);
  });

  it("⚠️ invertido ou vazio devolve lista VAZIA, e não um laço infinito", () => {
    expect(mesesDoIntervalo("2026-12", "2026-01")).toEqual([]);
    expect(mesesDoIntervalo("", "2026-01")).toEqual([]);
    expect(mesesDoIntervalo("2026-01", "")).toEqual([]);
  });
});

describe("formatarMes", () => {
  it("vira mês abreviado com o ano", () => {
    expect(formatarMes("2026-03")).toBe("mar/2026");
    expect(formatarMes("2026-01")).toBe("jan/2026");
    expect(formatarMes("2026-12")).toBe("dez/2026");
  });

  it("⚠️ o que não é `aaaa-mm` volta como veio, e vazio vira vazio", () => {
    expect(formatarMes("")).toBe("");
    expect(formatarMes(undefined)).toBe("");
    expect(formatarMes("2026-3")).toBe("2026-3");
    expect(formatarMes("2026-03-15")).toBe("2026-03-15");
  });

  it("🔴 não passa por `Date`: mês 01 em fuso negativo não volta para dezembro", () => {
    /* `new Date("2026-01-01")` é lido como UTC e, em UTC-3, cai em
       31/12/2025. É o mesmo tropeço que `formatarData` evita fatiando. */
    expect(formatarMes("2026-01")).toBe("jan/2026");
  });
});

describe("mesDeHoje e opcoesDeMes", () => {
  it("o mês de hoje sai com dois dígitos", () => {
    expect(mesDeHoje()).toBe("2026-09");
  });

  it("as opções vão do futuro para o passado e incluem hoje", () => {
    const opcoes = opcoesDeMes(3, 2);
    expect(opcoes.map((o) => o.value))
      .toEqual(["2026-11", "2026-10", "2026-09", "2026-08", "2026-07", "2026-06"]);
    expect(opcoes[2].label).toBe("set/2026");
  });
});
