import { describe, expect, it } from "vitest";

import { gradeDoMes, paraIso } from "./calendario";

describe("paraIso", () => {
  it("usa o fuso local -- toISOString viraria o dia à noite no Brasil", () => {
    // 23h do dia 21 em São Paulo é dia 22 em UTC.
    expect(paraIso(new Date(2026, 7, 21, 23, 30))).toBe("2026-08-21");
  });
});

describe("gradeDoMes", () => {
  it("tem sempre 42 células -- 6 semanas fixas, pro popover não pular de altura", () => {
    expect(gradeDoMes(2026, 7)).toHaveLength(42);
    expect(gradeDoMes(2026, 1)).toHaveLength(42); // fevereiro
  });

  it("começa no domingo da semana do dia 1", () => {
    // 01/08/2026 é sábado, então a grade abre em 26/07.
    expect(gradeDoMes(2026, 7)[0].iso).toBe("2026-07-26");
  });

  it("marca o que não é do mês em vez de omitir", () => {
    const grade = gradeDoMes(2026, 7);
    expect(grade[0].doMes).toBe(false);
    expect(grade.find((d) => d.iso === "2026-08-01")!.doMes).toBe(true);
  });
});
