import { describe, expect, it } from "vitest";

import { contar } from "./plural";

describe("contar", () => {
  it("usa o singular só pra exatamente 1", () => {
    expect(contar(1, "processo", "processos")).toBe("1 processo");
  });

  it("usa o plural pra zero e pra mais de um", () => {
    expect(contar(0, "processo", "processos")).toBe("0 processos");
    expect(contar(11, "processo", "processos")).toBe("11 processos");
  });

  it("aceita plural irregular -- por isso ele é parâmetro", () => {
    expect(contar(2, "opção", "opções")).toBe("2 opções");
  });
});
