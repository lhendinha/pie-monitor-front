import { describe, expect, it } from "vitest";
import { parseDeepLinkHistorico } from "./deepLink";

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
