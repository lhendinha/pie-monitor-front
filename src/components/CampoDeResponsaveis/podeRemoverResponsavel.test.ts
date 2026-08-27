import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  papelAtende: vi.fn(),
  getEmail: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
}));
vi.mock("../../services", () => mocks);

import { podeRemoverResponsavel } from "./podeRemoverResponsavel";

const EU = "eu@x.com";
const COLEGA = "colega@x.com";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEmail.mockReturnValue(EU);
});

describe("quem pode tirar alguém dos responsáveis", () => {
  it("qualquer um pode sair da PRÓPRIA lista", () => {
    /* Exigir um gerente pra deixar de acompanhar algo seria cadastro
       impedindo decisão de gente -- o mesmo que esta feature já recusa ao não
       bloquear a saída do subgrupo. */
    mocks.papelAtende.mockReturnValue(false);
    expect(podeRemoverResponsavel(EU)).toBe(true);
  });

  it("🔴 `user` NÃO pode tirar OUTRA pessoa", () => {
    /* A única das três ações que TIRA algo de alguém -- e o que ela tira é o
       aviso de prazo daquele processo. */
    mocks.papelAtende.mockReturnValue(false);
    expect(podeRemoverResponsavel(COLEGA)).toBe(false);
  });

  it("`manager`+ pode tirar qualquer um", () => {
    mocks.papelAtende.mockReturnValue(true);
    expect(podeRemoverResponsavel(COLEGA)).toBe(true);
  });

  it("⚠️ e-mail VAZIO não casa com sessão vazia", () => {
    /* A armadilha que `podeDestruirDocumento` e `podeExcluirSubgrupo` já
       documentam: `localStorage.getItem` devolve `""` se a chave existir
       vazia, e sem a guarda `Boolean(email)` os dois vazios se comparariam.

       ⚠️ A primeira versão desta função NÃO tinha a guarda -- só apareceu ao
       comparar com as duas irmãs, que é o que a pergunta "já não existe uma
       parecida?" serve pra provocar. */
    mocks.papelAtende.mockReturnValue(false);
    mocks.getEmail.mockReturnValue("");
    expect(podeRemoverResponsavel("")).toBe(false);
  });

  it("sem sessão, ninguém tira ninguém", () => {
    mocks.papelAtende.mockReturnValue(false);
    mocks.getEmail.mockReturnValue(null);
    expect(podeRemoverResponsavel(COLEGA)).toBe(false);
  });
});
