import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarSubgrupos: vi.fn(),
  listarQuadro: vi.fn(),
  listarTarefas: vi.fn(),
  listarMembrosDoGrupo: vi.fn(),
  detalhesTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, ...mocks };
});

import { ApiError } from "../../services/api/client";
import KanbanPage from "./index";

const TAREFA_DO_LINK = {
  subgrupo_id: "sg-trab",
  tarefa_id: "t-atrasada",
  titulo: "Protocolar recurso",
  /* Data ANTIGA de propósito: lembrete de prazo é justamente de tarefa
     atrasada, e o quadro abre filtrado no mês. Se a tela dependesse de a
     tarefa aparecer na listagem, este é o caso que falharia. */
  data: "2020-01-15",
  coluna_id: "c1",
  prioridade: "Alta",
};

function montar(tarefaDoLink?: { subgrupoId: string; tarefaId: string }) {
  return renderComProviders(
    <MemoryRouter>
      <KanbanPage tarefaDoLink={tarefaDoLink} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "sg-civel", nome: "Cível" },
      { subgrupo_id: "sg-trab", nome: "Trabalhista" },
    ],
    total: 2,
    total_paginas: 1,
  });
  mocks.listarQuadro.mockResolvedValue({
    colunas: [{ subgrupo_id: "sg-trab", coluna_id: "c1", nome: "A Fazer", ordem: 1 }],
  });
  // A listagem do quadro NÃO contém a tarefa do link -- é o ponto.
  mocks.listarTarefas.mockResolvedValue({ tarefas: [], total: 0, total_paginas: 0 });
  mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [] });
  mocks.detalhesTarefa.mockResolvedValue(TAREFA_DO_LINK);
});

describe("KanbanPage — link do lembrete de prazo", () => {
  it("abre o modal da tarefa mesmo ela estando FORA da janela do quadro", async () => {
    /* O quadro abre filtrado no mês, e lembrete de prazo é de tarefa
     * atrasada. Esperar que ela apareça na listagem não funcionaria
     * justamente nos casos que mais geram lembrete. */
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    expect(await screen.findByDisplayValue("Protocolar recurso")).toBeInTheDocument();
    expect(mocks.detalhesTarefa).toHaveBeenCalledWith("sg-trab", "t-atrasada");
  });

  it("abre o quadro DO SUBGRUPO da tarefa, não o padrão", async () => {
    // Sem isto o quadro abriria no último da lista e a tarefa do link
    // apareceria num quadro que não é o dela.
    montar({ subgrupoId: "sg-civel", tarefaId: "t-atrasada" });

    await waitFor(() => expect(mocks.listarQuadro).toHaveBeenCalledWith("sg-civel"));
  });

  it("fechar o modal NÃO o reabre", async () => {
    /* ⚠️ Este NÃO é controle da trava `linkConsumido`: conferi tirando a
     * trava e ele continua verde. O efeito só reroda quando as deps mudam,
     * e fechar o modal não mexe em `tarefaDoLinkQuery.data`.
     *
     * O que a trava protege é outra coisa, que este teste não alcança: ela
     * também desliga a consulta (`enabled: !linkConsumido`), e sem isso um
     * refetch -- `staleTime` é 0 no projeto inteiro -- devolveria o mesmo
     * dado e reabriria o modal por cima de quem já tinha fechado.
     *
     * Fica assim mesmo: cobre o caminho comum, e o comentário evita que
     * alguém confie nele pra mexer na trava. */
    const user = userEvent.setup();
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    await screen.findByDisplayValue("Protocolar recurso");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByDisplayValue("Protocolar recurso")).not.toBeInTheDocument(),
    );
  });

  it("tarefa excluída avisa e deixa o quadro utilizável", async () => {
    /* Link velho aponta pra tarefa que pode não existir mais. O quadro tem
     * que continuar sendo uma tela útil, e não um erro de página inteira. */
    mocks.detalhesTarefa.mockRejectedValue(new ApiError("Tarefa não encontrada", 404));
    montar({ subgrupoId: "sg-trab", tarefaId: "sumida" });

    expect(
      await screen.findByText(/Não foi possível abrir a tarefa do link/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gestão kanban" })).toBeInTheDocument();
  });

  it("sem link, não busca tarefa nenhuma", async () => {
    // Controle: o Kanban normal não pode ganhar uma requisição a mais.
    montar();

    await screen.findByRole("heading", { name: "Gestão kanban" });
    expect(mocks.detalhesTarefa).not.toHaveBeenCalled();
  });
});
