import { describe, expect, it } from "vitest";
import { parseDeepLinkHistorico, parseProcessoAvulso } from "./deepLink";

describe("parseDeepLinkHistorico", () => {
  it("os dois parâmetros presentes -- devolve o objeto", () => {
    expect(parseDeepLinkHistorico("?processo=123&comunicacao=456")).toEqual({
      processo: "123",
      comunicacaoId: "456",
    });
  });

  it("só processo, sem comunicacao -- null", () => {
    expect(parseDeepLinkHistorico("?processo=123")).toBeNull();
  });

  it("só comunicacao, sem processo -- null", () => {
    expect(parseDeepLinkHistorico("?comunicacao=456")).toBeNull();
  });

  it("nenhum dos dois -- null", () => {
    expect(parseDeepLinkHistorico("?outroParam=x")).toBeNull();
  });

  it("query string vazia -- null", () => {
    expect(parseDeepLinkHistorico("")).toBeNull();
  });

  it("ordem dos parâmetros não importa", () => {
    expect(parseDeepLinkHistorico("?comunicacao=456&processo=123")).toEqual({
      processo: "123",
      comunicacaoId: "456",
    });
  });
});

describe("parseProcessoAvulso", () => {
  it("devolve o número quando só veio ?processo=", () => {
    expect(parseProcessoAvulso("?processo=123")).toBe("123");
  });

  it("devolve null quando o link está completo -- aí quem manda é o de Histórico", () => {
    expect(parseProcessoAvulso("?processo=123&comunicacao=9")).toBeNull();
  });

  it("devolve null sem nenhum parâmetro", () => {
    expect(parseProcessoAvulso("")).toBeNull();
    expect(parseProcessoAvulso("?comunicacao=9")).toBeNull();
  });
});
