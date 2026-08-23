import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  getEmail: vi.fn(),
  getApelido: vi.fn(),
  resumoDaAreaDeTrabalho: vi.fn(),
  listarTarefas: vi.fn(),
  listarQuadro: vi.fn(),
  atualizarTarefa: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, ...mocks };
});

import WorkspacePage from "./index";

/** `ResumoRapido` usa `useNavigate` -- cada número leva à lista que o
 * gerou -- então a tela precisa de um Router mesmo num teste que só olha
 * botões de tarefa. */
function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={["/"]}>
      <WorkspacePage />
    </MemoryRouter>,
  );
}

const RESUMO = {
  a_verificar_ate_hoje: 0,
  prazo_final_em_7_dias: 0,
  tarefas_atrasadas: 0,
  tarefas_sem_responsavel: 0,
  envios_com_falha: 0,
  minhas_concluidas: 0,
  minhas_atrasadas: 0,
  minhas_a_concluir: 0,
  processos_total: 0,
  atendimentos_em_andamento: 0,
  movimentacoes_7_dias: 0,
};

const tarefa = (id: string, titulo: string, responsavel: string | null) => ({
  subgrupo_id: "sg",
  tarefa_id: id,
  titulo,
  data: "2026-09-01",
  coluna_id: "c1",
  prioridade: "Média",
  responsavel_id: responsavel,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEmail.mockReturnValue("ana@argos.local");
  mocks.getApelido.mockReturnValue("Ana Paula");
  mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO);
  mocks.listarQuadro.mockResolvedValue({
    colunas: [{ subgrupo_id: "sg", coluna_id: "fim", nome: "Concluído", ordem: 2, e_conclusao: true }],
  });
  // Dois cards pedem a mesma rota com filtros diferentes: "minhas" e "sem
  // responsável". O `responsavel` do parâmetro é o que separa os dois.
  mocks.listarTarefas.mockImplementation((p: { responsavel?: string }) =>
    Promise.resolve(
      p?.responsavel === "eu"
        ? {
            tarefas: [tarefa("t1", "Protocolar réplica", "ana@argos.local"), tarefa("t2", "Juntar procuração", "ana@argos.local")],
            total: 2,
            total_paginas: 1,
          }
        : { tarefas: [tarefa("t3", "Conferir prazo", null), tarefa("t4", "Ler intimação", null)], total: 2, total_paginas: 1 },
    ),
  );
});

describe("WorkspacePage — retorno por linha", () => {
  it("concluir trava SÓ a tarefa clicada", async () => {
    /* Já travou a lista inteira: com dez tarefas, concluir uma desabilitava
     * as dez e parecia que a tela congelou -- e nada dizia QUAL estava
     * indo. O PATCH aqui nunca assenta. */
    mocks.atualizarTarefa.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Concluir Protocolar réplica" }));

    expect(screen.getByRole("button", { name: "Concluir Protocolar réplica" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Concluir Juntar procuração" })).toBeEnabled();
  });

  it("assumir trava SÓ a tarefa clicada", async () => {
    mocks.atualizarTarefa.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Assumir Conferir prazo" }));

    expect(screen.getByRole("button", { name: "Assumir Conferir prazo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Assumir Ler intimação" })).toBeEnabled();
  });

  it("em repouso, nenhum botão nasce travado", async () => {
    // Controle dos dois acima: sem ele, eles passariam mesmo se a tela
    // travasse tudo desde o início.
    montar();

    expect(await screen.findByRole("button", { name: "Concluir Protocolar réplica" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Assumir Conferir prazo" })).toBeEnabled();
  });
});
