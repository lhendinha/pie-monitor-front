import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarSubgrupos: vi.fn(),
  listarQuadro: vi.fn(),
  listarTarefas: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
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
    colunas: [
      { subgrupo_id: "sg-trab", coluna_id: "c1", nome: "A Fazer", ordem: 1, e_conclusao: false, e_arquivado: false },
      { subgrupo_id: "sg-trab", coluna_id: "c2", nome: "Concluído", ordem: 2, e_conclusao: true, e_arquivado: false },
      { subgrupo_id: "sg-trab", coluna_id: "c3", nome: "Arquivado", ordem: 3, e_conclusao: false, e_arquivado: true },
    ],
  });
  // A listagem do quadro NÃO contém a tarefa do link -- é o ponto.
  mocks.listarTarefas.mockResolvedValue({ tarefas: [], total: 0, total_paginas: 0 });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [] });
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

  it("o Arquivado NÃO aparece no quadro por padrão", async () => {
    /* Depósito do que já saiu do fluxo -- à vista o tempo todo, rouba uma
     * coluna de largura pro que ninguém está tocando. */
    montar();

    expect(await screen.findByText("A Fazer")).toBeInTheDocument();
    expect(screen.queryByText("Arquivado")).not.toBeInTheDocument();
  });

  it("a pílula revela a coluna, e o rótulo diz o ESTADO", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Sem arquivadas" }));

    expect(await screen.findByText("Arquivado")).toBeInTheDocument();
    // O rótulo vira o estado novo, como as outras pílulas da barra.
    expect(screen.getByRole("button", { name: "Com arquivadas" })).toBeInTheDocument();
  });

  it("'Limpar filtros' NÃO esconde a coluna revelada", async () => {
    /* Ligar ADICIONA uma coluna, nunca esconde tarefa -- não é filtro, é
     * preferência de visualização. Limpar não pode desfazer o que a pessoa
     * acabou de revelar. */
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Sem arquivadas" }));
    await screen.findByText("Arquivado");
    await user.type(screen.getByLabelText(/Pesquisar cartão/), "nada-encontra-isso");
    const limpar = await screen.findByRole("button", { name: "Limpar filtros" });
    await user.click(limpar);

    expect(await screen.findByText("Arquivado")).toBeInTheDocument();
  });

  it("sem link, não busca tarefa nenhuma", async () => {
    // Controle: o Kanban normal não pode ganhar uma requisição a mais.
    montar();

    await screen.findByRole("heading", { name: "Gestão kanban" });
    expect(mocks.detalhesTarefa).not.toHaveBeenCalled();
  });
});

describe("busca por texto", () => {
  it("🔴 filtra de verdade -- antes casava com TODO cartão", async () => {
    /* `(t.processo_numero || "").includes(busca.replace(/\D/g, ""))`: com
     * uma busca sem número, o segundo argumento vira `""`, e `"".includes("")`
     * é `true` -- para toda tarefa, inclusive as sem processo. Digitar
     * "recurso" no campo não mudava nada no quadro, e o estado vazio nunca
     * aparecia. Só funcionava digitando número. */
    const user = userEvent.setup();
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        { ...TAREFA_DO_LINK, tarefa_id: "t-a", titulo: "Protocolar recurso", data: "2026-08-20" },
        { ...TAREFA_DO_LINK, tarefa_id: "t-b", titulo: "Audiência de conciliação", data: "2026-08-20" },
      ],
      total: 2,
      total_paginas: 1,
    });
    montar();

    await screen.findByText("Protocolar recurso");
    await user.type(screen.getByLabelText(/Pesquisar cartão/), "recurso");

    await waitFor(() =>
      expect(screen.queryByText("Audiência de conciliação")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Protocolar recurso")).toBeInTheDocument();
  });
});
