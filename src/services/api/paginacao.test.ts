import { describe, expect, it, vi } from "vitest";

import { todasAsPaginas } from "./paginacao";

describe("todasAsPaginas", () => {
  it("🔴 junta TODAS as páginas -- pedir 100 não é 'traz tudo'", async () => {
    /* Seis telas pediam `tamanhoPagina: TETO_POR_PAGINA` (100, o máximo que
     * a API aceita) tratando isso como "o conjunto inteiro". Acima de 100
     * itens a lista vinha cortada em silêncio, e o nome virava o id cru na
     * tela -- com o fallback documentado como se fosse só "ainda
     * carregando". O docstring de `useCatalogosDeProcesso` sempre disse
     * "precisa do conjunto inteiro, não de uma página". */
    const buscar = vi
      .fn()
      .mockResolvedValueOnce({ clientes: [{ id: 1 }, { id: 2 }], total: 3, total_paginas: 2 })
      .mockResolvedValueOnce({ clientes: [{ id: 3 }], total: 3, total_paginas: 2 });

    const juntos = await todasAsPaginas<{ id: number }>(buscar, "clientes");

    expect(juntos).toHaveLength(3);
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar.mock.calls[1][0]).toMatchObject({ pagina: 2 });
  });

  it("para na primeira quando já veio tudo", async () => {
    const buscar = vi.fn().mockResolvedValue({ clientes: [{ id: 1 }], total: 1, total_paginas: 1 });
    await todasAsPaginas<{ id: number }>(buscar, "clientes");
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it("não gira para sempre se as contas do servidor discordarem", async () => {
    // `total` diz que faltam itens, mas a página volta vazia -- para mesmo assim.
    const buscar = vi.fn().mockResolvedValue({ clientes: [], total: 999, total_paginas: 999 });
    const juntos = await todasAsPaginas<{ id: number }>(buscar, "clientes");
    expect(juntos).toEqual([]);
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});
