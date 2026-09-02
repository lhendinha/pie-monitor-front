import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { focusManager } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarDocumentos: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarClientes: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
}));
vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, ...mocks };
});

import DocumentosVinculados from "./index";

const VAZIO = { documentos: [], total: 0, total_paginas: 1 };
const COM_UM = {
  documentos: [{ subgrupo_id: "s1", documento_id: "d1", titulo: "Contrato", tipo: "arquivo" }],
  total: 1, total_paginas: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [{ subgrupo_id: "s1", nome: "Cível" }], total: 1, total_paginas: 1 });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [], total: 0, total_paginas: 1 });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
});

describe("a recarga não pode remontar o modal", () => {
  it("🔴 a lista trocar de estado NÃO apaga o que foi digitado", async () => {
    /* O defeito, medido em 02/09/2026: cada ramo desta aba (carregando, erro,
       lista vazia, lista cheia) devolvia a própria árvore com o `{modal}`
       dentro, e as raízes eram diferentes. Quando a lista trocava de estado
       com o modal aberto, o React via outro tipo de elemento naquela posição e
       REMONTAVA o modal.

       ⚠️ Ele não sumia -- continuava na tela e voltava VAZIO. Pior que sumir:
       a pessoa vê a mesma janela e não percebe que o arquivo e o texto se
       foram. E a guarda de descarte não alcança isso: ninguém fechou nada.

       O gatilho é comum: `staleTime` é 0 e `refetchOnWindowFocus` está no
       padrão, então basta sair para outro app e voltar. */
    mocks.listarDocumentos.mockResolvedValue(VAZIO);
    const usuario = userEvent.setup();
    renderComProviders(
      <MemoryRouter><DocumentosVinculados
        filtro={{ processoNumero: "1" }}
        subgrupoInicial="s1"
        vazio="Nenhum documento."
      /></MemoryRouter>,
    );
    await screen.findByText("Nenhum documento.");

    await usuario.click(screen.getByRole("button", { name: /Adicionar documento/ }));
    const titulo = await screen.findByLabelText(/^Título/);
    await usuario.type(titulo, "Petição inicial");
    expect(titulo).toHaveValue("Petição inicial");

    // a recarga traz um documento -- a aba troca de ramo
    mocks.listarDocumentos.mockResolvedValue(COM_UM);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await waitFor(() => expect(screen.getByText("Contrato")).toBeInTheDocument());

    expect(screen.getByLabelText(/^Título/)).toHaveValue("Petição inicial");
  });
});
