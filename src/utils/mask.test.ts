import { describe, expect, it } from "vitest";
import { apenasDigitos, mascararNumeroProcesso } from "./mask";

describe("apenasDigitos", () => {
  it("remove tudo que não é dígito", () => {
    expect(apenasDigitos("1000476-69.2018.4.01.3801")).toBe("10004766920184013801");
  });

  it("limita a 20 caracteres mesmo com mais dígitos", () => {
    expect(apenasDigitos("1".repeat(30))).toHaveLength(20);
  });

  it("null/undefined vira string vazia", () => {
    expect(apenasDigitos(null)).toBe("");
    expect(apenasDigitos(undefined)).toBe("");
  });

  it("string vazia continua vazia", () => {
    expect(apenasDigitos("")).toBe("");
  });
});

describe("mascararNumeroProcesso", () => {
  it("aplica a máscara completa em 20 dígitos", () => {
    expect(mascararNumeroProcesso("10004766920184013801")).toBe("1000476-69.2018.4.01.3801");
  });

  it("aplica a máscara progressivamente conforme a pessoa digita", () => {
    expect(mascararNumeroProcesso("1000476")).toBe("1000476");
    expect(mascararNumeroProcesso("100047669")).toBe("1000476-69");
    expect(mascararNumeroProcesso("1000476692018")).toBe("1000476-69.2018");
    expect(mascararNumeroProcesso("10004766920184")).toBe("1000476-69.2018.4");
    expect(mascararNumeroProcesso("1000476692018401")).toBe("1000476-69.2018.4.01");
  });

  it("aceita entrada já mascarada (idempotente)", () => {
    expect(mascararNumeroProcesso("1000476-69.2018.4.01.3801")).toBe("1000476-69.2018.4.01.3801");
  });

  it("string vazia/nula vira string vazia", () => {
    expect(mascararNumeroProcesso("")).toBe("");
    expect(mascararNumeroProcesso(null)).toBe("");
  });
});
