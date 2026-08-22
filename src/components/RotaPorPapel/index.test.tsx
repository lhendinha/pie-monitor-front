import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({ papelAtende: vi.fn() }));

vi.mock("../../services", async () => {
  const real = await vi.importActual<Record<string, unknown>>("../../services");
  return { ...real, ...mocks };
});

import RotaPorPapel from "./index";

function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={["/grupo"]}>
      <Routes>
        <Route path="/processos" element={<div>tela de processos</div>} />
        <Route element={<RotaPorPapel minimo="manager" />}>
          <Route path="/grupo" element={<div>tela de grupo</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("RotaPorPapel", () => {
  it("deixa passar quem atende o piso", () => {
    mocks.papelAtende.mockReturnValue(true);
    montar();

    expect(screen.getByText("tela de grupo")).toBeInTheDocument();
  });

  it("quem não atende cai em Processos -- não é erro, é lugar errado", () => {
    // Esconder do menu sem fechar a rota era cosmético: bastava digitar o
    // endereço. A garantia de dado continua sendo do servidor.
    mocks.papelAtende.mockReturnValue(false);
    montar();

    expect(screen.getByText("tela de processos")).toBeInTheDocument();
    expect(screen.queryByText("tela de grupo")).not.toBeInTheDocument();
  });
});
