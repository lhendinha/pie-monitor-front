import { describe, expect, it } from "vitest";
import { apenasDigitos, mascararCep, mascararCpfCnpj, mascararNumeroProcesso, mascararTelefone } from "./mask";

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
  it("aplica a máscara completa em 11 dígitos (celular)", () => {
    expect(mascararTelefone("11987654321")).toBe("(11) 98765-4321");
  });

  // Achado 17: fixo (10 dígitos) usava o mesmo corte do celular (prefixo de
  // 5) e saía errado -- "(11) 33334-444" em vez de "(11) 3333-4444". Não
  // tinha teste cobrindo esse tamanho, foi por isso que passou despercebido.
  it("aplica a máscara completa em 10 dígitos (fixo)", () => {
    expect(mascararTelefone("1133334444")).toBe("(11) 3333-4444");
  });

  it("aplica a máscara progressivamente conforme a pessoa digita, assumindo fixo (prefixo de 4) até o 9º dígito", () => {
    expect(mascararTelefone("1")).toBe("1");
    expect(mascararTelefone("11")).toBe("(11)");
    expect(mascararTelefone("111987")).toBe("(11) 1987");
    expect(mascararTelefone("1119876")).toBe("(11) 1987-6");
    expect(mascararTelefone("11198765")).toBe("(11) 1987-65");
  });

  it("o prefixo vira 5 dígitos assim que o 9º dígito (depois do DDD) é digitado -- reflow de fixo pra celular", () => {
    expect(mascararTelefone("1119876543")).toBe("(11) 1987-6543"); // 10 dígitos, ainda fixo
    expect(mascararTelefone("11198765432")).toBe("(11) 19876-5432"); // 11º dígito -- vira celular
  });

  it("limita a 11 dígitos mesmo com mais", () => {
    expect(apenasDigitos(mascararTelefone("1".repeat(20)))).toHaveLength(11);
  });

  it("string vazia/nula vira string vazia", () => {
    expect(mascararTelefone("")).toBe("");
    expect(mascararTelefone(null)).toBe("");
  });
});

describe("mascararCep", () => {
  it("aplica a máscara completa em 8 dígitos", () => {
    expect(mascararCep("30130010")).toBe("30130-010");
  });

  it("aplica a máscara progressivamente conforme a pessoa digita", () => {
    expect(mascararCep("3")).toBe("3");
    expect(mascararCep("30130")).toBe("30130");
    expect(mascararCep("301300")).toBe("30130-0");
    expect(mascararCep("30130010")).toBe("30130-010");
  });

  it("aceita entrada já mascarada (idempotente)", () => {
    expect(mascararCep("30130-010")).toBe("30130-010");
  });

  it("limita a 8 dígitos mesmo com mais", () => {
    expect(mascararCep("301300109999")).toBe("30130-010");
  });

  it("descarta o que não é dígito", () => {
    expect(mascararCep("30.130-010")).toBe("30130-010");
    expect(mascararCep("abc")).toBe("");
  });

  it("string vazia/nula vira string vazia", () => {
    expect(mascararCep("")).toBe("");
    expect(mascararCep(null)).toBe("");
    expect(mascararCep(undefined)).toBe("");
  });
});
