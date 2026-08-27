import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  criarTarefa: vi.fn(),
  listarQuadro: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
  listarClientes: vi.fn(),
}));

vi.mock("../../../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../services")>();
  return { ...real, ...mocks };
});

import Movimentacoes from "./index";

const SUBGRUPO = "sg-civel";
const NUMERO = "00002668720218130559";

const COMUNICACAO = {
  comunicacao_id: 671027498,
  numero_processo: NUMERO,
  tipo_comunicacao: "Intimação",
  nome_orgao: "Vara Única",
  data_disponibilizacao: "2026-08-15",
  texto: "Fica a parte intimada a se manifestar em 15 dias.",
  tem_envio: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarQuadro.mockResolvedValue({ colunas: [{ coluna_id: "c1", nome: "A fazer", ordem: 1 }] });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [{ subgrupo_id: SUBGRUPO, nome: "Cível", grupo_id: "g1" }] });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
});

/** Monta dentro da rota real: o `subgrupoId` da tarefa vem da URL, não de
 * uma busca -- o MESMO número de processo vive em vários subgrupos, e é
 * por isso que ele está em `/processos/:subgrupoId/:numero`. */
function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={[`/processos/${SUBGRUPO}/${NUMERO}`]}>
      <Routes>
        <Route
          path="/processos/:subgrupoId/:numero"
          element={<Movimentacoes comunicacoes={[COMUNICACAO]} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function abrirODetalhe() {
  const user = userEvent.setup();
  montar();
  await user.click(await screen.findByText("Intimação", { exact: false }));
  await screen.findByText("Detalhes da movimentação");
  return user;
}

describe("Adicionar tarefa a partir da movimentação", () => {
  it("o botão aparece no modal de detalhes", async () => {
    await abrirODetalhe();

    expect(screen.getByRole("button", { name: /Adicionar tarefa/ })).toBeInTheDocument();
  });

  it("🔴 aparece MESMO sem e-mail enviado -- não depende do rodapé condicional", async () => {
    /* O rodapé de `ModalDeMovimentacao` só existe quando há e-mail pra onde
       ir (`RodapeDeAcoes` vazio desenharia uma faixa cinza sem nada dentro).
       Se o botão tivesse ido pra lá, ele sumiria justamente na maioria das
       movimentações -- o robô grava o acervo inteiro e só notifica o que
       está na janela. */
    await abrirODetalhe();

    expect(screen.getByRole("button", { name: /Adicionar tarefa/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver o e-mail enviado/ })).not.toBeInTheDocument();
  });

  it("abre a tarefa com o processo já vinculado, e com o rótulo mascarado", async () => {
    const user = await abrirODetalhe();

    await user.click(screen.getByRole("button", { name: /Adicionar tarefa/ }));

    const dialogos = await screen.findAllByRole("dialog");
    const modalDaTarefa = dialogos.find((d) => within(d).queryByText("Nova tarefa"));
    expect(modalDaTarefa).toBeDefined();
    // Mascarado, não o CNJ de 20 dígitos: número cru não se confere de relance.
    expect(within(modalDaTarefa!).getByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
  });

  it("🔴 o modal de detalhes CONTINUA aberto -- a pessoa estava lendo a movimentação", async () => {
    const user = await abrirODetalhe();

    await user.click(screen.getByRole("button", { name: /Adicionar tarefa/ }));
    await screen.findByText("Nova tarefa");

    expect(screen.getByText("Detalhes da movimentação")).toBeInTheDocument();
  });

  it("🔴 a tarefa nasce no subgrupo da URL, não em outro qualquer", async () => {
    /* O mesmo número vive em N subgrupos; o certo é aquele em que a pessoa
       está. Sem isso a tarefa nasceria no primeiro da lista. */
    const user = await abrirODetalhe();

    await user.click(screen.getByRole("button", { name: /Adicionar tarefa/ }));
    await screen.findByText("Nova tarefa");

    expect(mocks.listarQuadro).toHaveBeenCalledWith(SUBGRUPO);
  });

  it("fechar a tarefa deixa o detalhe aberto", async () => {
    const user = await abrirODetalhe();

    await user.click(screen.getByRole("button", { name: /Adicionar tarefa/ }));
    await screen.findByText("Nova tarefa");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Nova tarefa")).not.toBeInTheDocument();
    expect(screen.getByText("Detalhes da movimentação")).toBeInTheDocument();
  });
});
