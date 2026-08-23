import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  papelAtende: vi.fn(),
  getEmail: vi.fn(),
}));

vi.mock("../../../services", () => mocks);

import { podeExcluirSubgrupo } from "./podeExcluirSubgrupo";
import type { Subgrupo } from "../../../types";

/** `papelAtende` é hierárquico no serviço real -- quem é admin também
 * "atende" manager. Um `mockReturnValue(true)` cru esconderia justamente a
 * diferença entre os dois papéis, que é o que este arquivo testa. */
function comoPapel(papel: "user" | "manager" | "admin") {
  const ordem = ["user", "manager", "admin"];
  mocks.papelAtende.mockImplementation(
    (minimo: string) => ordem.indexOf(papel) >= ordem.indexOf(minimo),
  );
}

const subgrupo = (criado_por?: string): Subgrupo =>
  ({ subgrupo_id: "s1", nome: "Cível", criado_por }) as Subgrupo;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEmail.mockReturnValue("ana@argos.local");
});

describe("podeExcluirSubgrupo", () => {
  it("admin exclui qualquer subgrupo, inclusive de outra pessoa", () => {
    comoPapel("admin");
    expect(podeExcluirSubgrupo(subgrupo("bruno@argos.local"))).toBe(true);
  });

  it("manager exclui o que ele mesmo criou", () => {
    comoPapel("manager");
    expect(podeExcluirSubgrupo(subgrupo("ana@argos.local"))).toBe(true);
  });

  it("manager NÃO exclui subgrupo de outra pessoa", () => {
    comoPapel("manager");
    expect(podeExcluirSubgrupo(subgrupo("bruno@argos.local"))).toBe(false);
  });

  it("user não exclui nem o que criou -- ele nem pode criar", () => {
    comoPapel("user");
    expect(podeExcluirSubgrupo(subgrupo("ana@argos.local"))).toBe(false);
  });

  it("subgrupo legado, sem `criado_por`, não casa com ninguém", () => {
    comoPapel("manager");
    expect(podeExcluirSubgrupo(subgrupo(""))).toBe(false);
    expect(podeExcluirSubgrupo(subgrupo(undefined))).toBe(false);
  });

  it("e-mail vazio em sessão não casa com subgrupo legado", () => {
    // Este é o caso que exige o `Boolean(criado_por)` no helper: sem ele a
    // comparação vira `"" === ""` e QUALQUER manager passaria a excluir
    // QUALQUER subgrupo legado. Verificado tirando o guard -- só este teste
    // fica vermelho.
    comoPapel("manager");
    mocks.getEmail.mockReturnValue("");
    expect(podeExcluirSubgrupo(subgrupo(""))).toBe(false);
  });
});
