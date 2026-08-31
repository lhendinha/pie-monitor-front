import { describe, expect, it } from "vitest";

import { contar, unidade } from "./plural";

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

describe("unidade", () => {
  /* 🔴 Existe para quando o NÚMERO já está na tela: em "Arquivar concluídas
     depois de [8] 8 dias" o campo mostra o 8 e `contar` o repetia ao lado. */
  it("devolve SÓ a palavra, sem o número", () => {
    expect(unidade(8, "dia", "dias")).toBe("dias");
    expect(unidade(8, "dia", "dias")).not.toContain("8");
  });

  it("⚠️ mas a concordância continua valendo", () => {
    expect(unidade(1, "dia", "dias")).toBe("dia");
    expect(unidade(0, "dia", "dias")).toBe("dias");
  });

  it("plural irregular também -- é parâmetro, como em `contar`", () => {
    expect(unidade(2, "opção", "opções")).toBe("opções");
  });
});
