import { describe, expect, it } from "vitest";

import { centavosDoTexto, formatarCentavos } from "./dinheiro";

describe("formatarCentavos", () => {
  it("põe a vírgula e o ponto de milhar", () => {
    expect(formatarCentavos(123456)).toBe("1.234,56");
    expect(formatarCentavos(100000000)).toBe("1.000.000,00");
  });

  it("mantém os dois dígitos dos centavos", () => {
    expect(formatarCentavos(1)).toBe("0,01");
    expect(formatarCentavos(1005)).toBe("10,05");
    expect(formatarCentavos(1050)).toBe("10,50");
  });

  it("formata zero", () => {
    expect(formatarCentavos(0)).toBe("0,00");
  });

  it("põe o sinal do negativo à frente, e só ele", () => {
    expect(formatarCentavos(-123456)).toBe("-1.234,56");
    expect(formatarCentavos(-1)).toBe("-0,01");
  });
});

describe("centavosDoTexto", () => {
  it("lê o que a pessoa digita com vírgula", () => {
    expect(centavosDoTexto("1234,56")).toBe(123456);
    expect(centavosDoTexto("0,01")).toBe(1);
    expect(centavosDoTexto("10")).toBe(1000);
    expect(centavosDoTexto("10,5")).toBe(1050);
  });

  it("aceita o ponto do teclado numérico", () => {
    expect(centavosDoTexto("1234.56")).toBe(123456);
  });

  it("com vírgula E ponto, o ponto é milhar", () => {
    expect(centavosDoTexto("1.234,56")).toBe(123456);
    expect(centavosDoTexto("1.000.000,00")).toBe(100000000);
  });

  it("ignora espaço em volta", () => {
    expect(centavosDoTexto("  12,30  ")).toBe(1230);
  });

  it("devolve null para o vazio -- que NÃO é zero", () => {
    expect(centavosDoTexto("")).toBeNull();
    expect(centavosDoTexto("   ")).toBeNull();
    // 🔴 O par que explica o `null`: zero digitado é um valor, vazio não é.
    expect(centavosDoTexto("0")).toBe(0);
  });

  it("devolve null para o que não é número", () => {
    for (const ruim of ["abc", "R$ 10", "12,345", "1,2,3", "--5", "1e3", "10,", ",50"]) {
      expect(centavosDoTexto(ruim), ruim).toBeNull();
    }
  });

  it("arredonda o que o ponto flutuante estragaria", () => {
    // 8,7 * 100 é 869,9999... em ponto flutuante; sem o arredondamento
    // isto viraria 869 centavos, um a menos.
    expect(centavosDoTexto("8,70")).toBe(870);
    expect(centavosDoTexto("1,15")).toBe(115);
    expect(centavosDoTexto("29,60")).toBe(2960);
  });

  it("a ida e a volta não perdem centavo", () => {
    for (const centavos of [0, 1, 99, 100, 1050, 123456, 100000000]) {
      expect(centavosDoTexto(formatarCentavos(centavos)), String(centavos)).toBe(centavos);
    }
  });
});
