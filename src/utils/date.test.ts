import { describe, expect, it } from "vitest";
import { dataHojeExtenso, formatarData, formatarDataHora, formatarDataHoraAmPm } from "./date";

// Timezone fixado em America/Sao_Paulo via vite.config.ts (test.env.TZ) --
// os horários abaixo assumem isso.

describe("formatarData", () => {
  it("formata data pura (sem hora) em dd/mm/aaaa", () => {
    expect(formatarData("2026-07-17")).toBe("17/07/2026");
  });

  it("ignora sufixo de hora/timezone, sem converter -- evita o bug de virar o dia anterior em America/Sao_Paulo", () => {
    expect(formatarData("2026-07-17T00:00:00Z")).toBe("17/07/2026");
  });

  it("string vazia/undefined vira string vazia", () => {
    expect(formatarData(undefined)).toBe("");
    expect(formatarData("")).toBe("");
  });

  it("string fora do padrão aaaa-mm-dd devolve a original em vez de quebrar", () => {
    expect(formatarData("isso-nao-e-data")).toBe("isso-nao-e-data");
  });
});

describe("formatarDataHora", () => {
  it("formata ISO em dd/mm/aaaa, hh:mm -- Intl.DateTimeFormat pt-BR insere vírgula por padrão (diferente de formatarDataHoraAmPm, que monta a string na mão sem vírgula)", () => {
    expect(formatarDataHora("2026-08-14T15:30:00Z")).toBe("14/08/2026, 12:30");
  });

  it("string vazia/undefined vira string vazia", () => {
    expect(formatarDataHora(undefined)).toBe("");
    expect(formatarDataHora("")).toBe("");
  });

  it("ISO inválido devolve a string original em vez de quebrar", () => {
    expect(formatarDataHora("isso-nao-e-data")).toBe("isso-nao-e-data");
  });
});

describe("formatarDataHoraAmPm", () => {
  it("formata meio-dia como 12:00PM, não 00:00PM", () => {
    // 12h em America/Sao_Paulo (UTC-3) = 15h UTC.
    expect(formatarDataHoraAmPm("2026-08-14T15:00:00Z")).toBe("14/08/2026 12:00PM");
  });

  it("formata meia-noite como 12:00AM, não 00:00AM", () => {
    expect(formatarDataHoraAmPm("2026-08-14T03:00:00Z")).toBe("14/08/2026 12:00AM");
  });

  it("formata um horário comum da tarde", () => {
    expect(formatarDataHoraAmPm("2026-08-14T19:13:00Z")).toBe("14/08/2026 04:13PM");
  });

  it("formata um horário comum da manhã", () => {
    expect(formatarDataHoraAmPm("2026-08-14T13:05:00Z")).toBe("14/08/2026 10:05AM");
  });

  it("string vazia/undefined vira string vazia", () => {
    expect(formatarDataHoraAmPm(undefined)).toBe("");
    expect(formatarDataHoraAmPm("")).toBe("");
  });

  it("ISO inválido devolve a string original em vez de quebrar", () => {
    expect(formatarDataHoraAmPm("isso-nao-e-data")).toBe("isso-nao-e-data");
  });
});

describe("dataHojeExtenso", () => {
  it("devolve uma string não vazia no formato por extenso em português", () => {
    const resultado = dataHojeExtenso();
    expect(resultado).toMatch(/\d{4}/); // contém o ano
    expect(resultado.length).toBeGreaterThan(10);
  });
});
