import { beforeEach, describe, expect, it, vi } from "vitest";

/* A assinatura vai explícita: `vi.fn(async () => …)` infere ZERO parâmetros,
   e aí ler `mock.calls[0][1]` não compila. */
const mocks = vi.hoisted(() => ({
  chamar: vi.fn(async (_caminho: string, _opcoes?: { query?: Record<string, unknown> }) => ({})),
}));
vi.mock("./client", () => mocks);

import { listarDocumentos } from "./documentos";

/** O que sai no fio, para a listagem de documentos.
 *
 * 🔴 Irmão de `processos.test.ts`, e pela MESMA razão — que se repetiu em
 * 28/08/2026. O teste da tela dubla `listarDocumentos` inteiro, então ele
 * prova que a página passa `subgrupoId`, nunca que a função o transforma em
 * `subgrupo_id` na URL. Apagar essa linha do corpo da query passou batido
 * numa mutação: o filtro deixaria de filtrar **em silêncio**, porque
 * parâmetro de query desconhecido é simplesmente ignorado pelo servidor.
 */
function queryEnviada() {
  return mocks.chamar.mock.calls[0][1]?.query as Record<string, unknown>;
}

beforeEach(() => vi.clearAllMocks());

describe("os filtros que chegam ao servidor", () => {
  it("🔴 o subgrupo escolhido vai como `subgrupo_id`", async () => {
    await listarDocumentos({ subgrupoId: "sg-1" });
    expect(queryEnviada().subgrupo_id).toBe("sg-1");
  });

  it("sem escolha, o parâmetro não vai — e não vai como string vazia", async () => {
    /* ⚠️ O par negativo. `subgrupo_id=""` não é "sem filtro": o servidor
       trata string vazia como ausente hoje, mas isso é coincidência de
       implementação, não contrato. Mandar `undefined` é o que `chamar`
       sabe omitir. */
    await listarDocumentos({ busca: "x" });
    expect(queryEnviada().subgrupo_id).toBeUndefined();
  });
});
