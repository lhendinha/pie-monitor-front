import { describe, expect, it } from "vitest";
import { apenasDigitos, mascararCpfCnpj, mascararNumeroProcesso, mascararTelefone } from "./mask";

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

describe("mascararCpfCnpj", () => {
  it("aplica máscara de CPF com 11 dígitos", () => {
    expect(mascararCpfCnpj("12345678901")).toBe("123.456.789-01");
  });

  it("aplica máscara de CPF progressivamente", () => {
    expect(mascararCpfCnpj("123")).toBe("123");
    expect(mascararCpfCnpj("123456")).toBe("123.456");
    expect(mascararCpfCnpj("123456789")).toBe("123.456.789");
  });

  it("alterna pra máscara de CNPJ a partir do 12º dígito", () => {
    expect(mascararCpfCnpj("123456789012")).toBe("12.345.678/9012");
    expect(mascararCpfCnpj("12345678901234")).toBe("12.345.678/9012-34");
  });

  it("limita a 14 dígitos mesmo com mais", () => {
    expect(apenasDigitos(mascararCpfCnpj("1".repeat(20)))).toHaveLength(14);
  });

  it("string vazia/nula vira string vazia", () => {
    expect(mascararCpfCnpj("")).toBe("");
    expect(mascararCpfCnpj(null)).toBe("");
  });
});

describe("mascararTelefone", () => {
  it("aplica a máscara completa em 11 dígitos", () => {
    expect(mascararTelefone("11987654321")).toBe("(11) 98765-4321");
  });

  it("aplica a máscara progressivamente conforme a pessoa digita", () => {
    expect(mascararTelefone("1")).toBe("1");
    expect(mascararTelefone("11")).toBe("(11)");
    expect(mascararTelefone("119876")).toBe("(11) 9876");
    expect(mascararTelefone("1198765")).toBe("(11) 98765");
  });

  it("limita a 11 dígitos mesmo com mais", () => {
    expect(apenasDigitos(mascararTelefone("1".repeat(20)))).toHaveLength(11);
  });

  it("string vazia/nula vira string vazia", () => {
    expect(mascararTelefone("")).toBe("");
    expect(mascararTelefone(null)).toBe("");
  });
});
