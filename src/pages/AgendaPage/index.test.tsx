import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarTarefas: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
  /* ⚠️ Uma PÁGINA de membros, que é o que a pílula de pessoas passou a usar
     -- ela não baixa mais o grupo inteiro. Sem este mock a consulta ia pra
     rede de verdade, falhava, e o painel abria mostrando a falha em vez das
     opções. */
  listarMembrosDoGrupo: vi.fn(),
  listarQuadro: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarAtendimentos: vi.fn(),
  resumosDeAtendimentos: vi.fn(),
  listarProcessos: vi.fn(),
  papelAtende: vi.fn(),
  criarTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  removerTarefa: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import AgendaPage from "./index";

/** A tela é sobre datas, e "hoje" muda todo dia -- sem relógio fixo os
 * testes passariam hoje e falhariam amanhã. Uma quarta-feira de propósito:
 * no meio da semana, pra que "a semana visível" tenha dias dos dois lados. */
const HOJE = new Date(2026, 7, 19, 10, 0, 0);
const ISO_HOJE = "2026-08-19";

const COLUNAS = [
  { subgrupo_id: "s1", coluna_id: "c1", nome: "A Fazer", ordem: 1, e_conclusao: false, e_arquivado: false },
  { subgrupo_id: "s1", coluna_id: "c2", nome: "Concluído", ordem: 2, e_conclusao: true, e_arquivado: false },
  { subgrupo_id: "s1", coluna_id: "c3", nome: "Arquivado", ordem: 3, e_conclusao: false, e_arquivado: true },
];

function tarefa(parcial: Record<string, unknown>) {
  return {
    subgrupo_id: "s1",
    tarefa_id: "t1",
    titulo: "Tarefa",
    data: ISO_HOJE,
    coluna_id: "c1",
    prioridade: "Média",
    ...parcial,
  };
}

function comTarefas(...lista: Record<string, unknown>[]) {
  mocks.listarTarefas.mockResolvedValue({
    tarefas: lista,
    total: lista.length,
    total_paginas: 1,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(HOJE);

  mocks.papelAtende.mockReturnValue(true);
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "s1", nome: "Cível" },
      { subgrupo_id: "s2", nome: "Trabalhista" },
    ],
  });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana" }],
  });
  mocks.listarMembrosDoGrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana" }],
    total: 1,
    total_paginas: 1,
  });
  mocks.listarQuadro.mockResolvedValue({ colunas: COLUNAS });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [{ email: "ana@x.com", apelido: "Ana" }] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.resumosDeAtendimentos.mockResolvedValue({ resumos: [] });
  comTarefas();
});

async function montar() {
  renderComProviders(<AgendaPage />);
  return await screen.findByRole("heading", { name: "Agenda" });
}

const pilulaDeVisao = () =>
  screen.getByRole("button", { name: /Por mês|Por semana|Por dia|Em lista/ });

async function trocarVisao(nome: string) {
  await userEvent.click(pilulaDeVisao());
  await userEvent.click(await screen.findByRole("button", { name: new RegExp(`^${nome}$`) }));
}

describe("abertura", () => {
  it("abre em 'Por mês', como o artifact", async () => {
    await montar();
    expect(pilulaDeVisao()).toHaveTextContent("Por mês");
  });

  it("mostra o mês corrente", async () => {
    await montar();
    expect(await screen.findByText("Agosto de 2026")).toBeInTheDocument();
  });

  it("pede ao servidor a GRADE inteira, não só o mês", async () => {
    /* 🔴 As células de fora do mês mostram tarefa. Pedir 01–31 as deixaria
     * vazias sem erro nenhum. */
    await montar();
    await waitFor(() => expect(mocks.listarTarefas).toHaveBeenCalled());
    expect(mocks.listarTarefas).toHaveBeenCalledWith(
      expect.objectContaining({ dataDe: "2026-07-26", dataAte: "2026-09-05" }),
    );
  });
});

describe("subgrupos", () => {
  it("sem escolha, NÃO manda subgrupo -- o servidor entende 'todos'", async () => {
    await montar();
    await waitFor(() => expect(mocks.listarTarefas).toHaveBeenCalled());
    expect(mocks.listarTarefas).toHaveBeenCalledWith(
      expect.objectContaining({ subgrupoId: undefined }),
    );
  });
});

describe("navegação", () => {
  it("avança e volta o mês", async () => {
    await montar();
    await userEvent.click(screen.getByLabelText("Próximo período"));
    expect(await screen.findByText("Setembro de 2026")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Período anterior"));
    expect(await screen.findByText("Agosto de 2026")).toBeInTheDocument();
  });

  it("'Hoje' volta de onde estiver", async () => {
    await montar();
    await userEvent.click(screen.getByLabelText("Próximo período"));
    await userEvent.click(screen.getByLabelText("Próximo período"));
    await screen.findByText("Outubro de 2026");

    await userEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(await screen.findByText("Agosto de 2026")).toBeInTheDocument();
  });

  it("clicar num dia da grade abre a visão daquele dia", async () => {
    comTarefas(tarefa({ titulo: "Audiência", data: "2026-08-25" }));
    await montar();
    await waitFor(() => expect(mocks.listarTarefas).toHaveBeenCalled());

    await userEvent.click(await screen.findByRole("button", { name: /^Dia 25/ }));

    expect(pilulaDeVisao()).toHaveTextContent("Por dia");
    expect(await screen.findByText("Terça-feira, 25 de agosto")).toBeInTheDocument();
  });
});

describe("as quatro visões", () => {
  it("por dia mostra as tarefas do dia visível", async () => {
    comTarefas(tarefa({ titulo: "Protocolar réplica" }));
    await montar();
    await trocarVisao("Por dia");

    expect(await screen.findByText("Quarta-feira, 19 de agosto")).toBeInTheDocument();
    expect(screen.getAllByText("Protocolar réplica").length).toBeGreaterThan(0);
  });

  it("por dia, dia vazio DIZ que está vazio", async () => {
    await montar();
    await trocarVisao("Por dia");
    expect(await screen.findByText("Nenhuma tarefa com data neste dia.")).toBeInTheDocument();
  });

  it("em lista pula os dias SEM tarefa", async () => {
    comTarefas(
      tarefa({ tarefa_id: "t1", titulo: "Hoje sim", data: ISO_HOJE }),
      tarefa({ tarefa_id: "t2", titulo: "Daqui a três", data: "2026-08-22" }),
    );
    await montar();
    await trocarVisao("Em lista");

    // Só os dois dias com tarefa viram cabeçalho -- catorze cabeçalhos pra
    // achar dois com conteúdo faria rolar a tela à toa.
    expect(await screen.findByText("Quarta-feira, 19 de agosto")).toBeInTheDocument();
    expect(screen.getByText("Sábado, 22 de agosto")).toBeInTheDocument();
    expect(screen.queryByText("Quinta-feira, 20 de agosto")).not.toBeInTheDocument();
  });

  it("por semana mostra os sete dias", async () => {
    await montar();
    await trocarVisao("Por semana");
    for (const dia of ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]) {
      expect(await screen.findByText(dia)).toBeInTheDocument();
    }
  });
});

describe("concluída", () => {
  it("tacha a que está na coluna de CONCLUSÃO", async () => {
    comTarefas(tarefa({ titulo: "Já fiz", coluna_id: "c2" }));
    await montar();
    await trocarVisao("Por dia");

    const titulo = (await screen.findAllByText("Já fiz"))[0];
    await waitFor(() => expect(titulo).toHaveStyle({ textDecoration: "line-through" }));
  });

  it("tacha a ARQUIVADA também -- arquivada é concluída guardada", async () => {
    comTarefas(tarefa({ titulo: "Guardada", coluna_id: "c3" }));
    await montar();
    await trocarVisao("Por dia");

    const titulo = (await screen.findAllByText("Guardada"))[0];
    await waitFor(() => expect(titulo).toHaveStyle({ textDecoration: "line-through" }));
  });

  it("o MESMO id de coluna em quadros diferentes não se confunde", async () => {
    /* 🔴 Cada subgrupo tem o próprio quadro, e nada impede que "c1" seja
     * comum num e de conclusão no outro. Se a chave fosse só a coluna, a
     * tarefa aberta de um subgrupo apareceria tachada por causa do outro. */
    mocks.listarQuadro.mockImplementation((id: string) =>
      Promise.resolve({
        colunas: [
          {
            subgrupo_id: id,
            coluna_id: "c1",
            nome: "Primeira",
            ordem: 1,
            // Em s2, "c1" CONCLUI; em s1, não.
            e_conclusao: id === "s2",
            e_arquivado: false,
          },
        ],
      }),
    );
    comTarefas(
      tarefa({ tarefa_id: "ta", subgrupo_id: "s1", titulo: "Aberta aqui", coluna_id: "c1" }),
      tarefa({ tarefa_id: "tb", subgrupo_id: "s2", titulo: "Concluída lá", coluna_id: "c1" }),
    );
    await montar();
    await trocarVisao("Por dia");

    const concluida = (await screen.findAllByText("Concluída lá"))[0];
    await waitFor(() => expect(concluida).toHaveStyle({ textDecoration: "line-through" }));

    const aberta = screen.getAllByText("Aberta aqui")[0];
    expect(aberta).not.toHaveStyle({ textDecoration: "line-through" });
  });

  it("NÃO tacha a que está numa coluna comum", async () => {
    comTarefas(tarefa({ titulo: "Em aberto", coluna_id: "c1" }));
    await montar();
    await trocarVisao("Por dia");

    const titulo = (await screen.findAllByText("Em aberto"))[0];
    expect(titulo).not.toHaveStyle({ textDecoration: "line-through" });
  });
});

describe("coluna na linha", () => {
  it("mostra em que coluna a tarefa está", async () => {
    /* A Agenda não tem colunas -- é a única forma de saber em que pé a
     * tarefa está sem abri-la. É a primeira metade do `meta` do artifact. */
    comTarefas(tarefa({ titulo: "Protocolar", coluna_id: "c1" }));
    await montar();
    await trocarVisao("Por dia");

    expect((await screen.findAllByText("A Fazer")).length).toBeGreaterThan(0);
  });

  it("junta coluna e processo com '·', como o artifact", async () => {
    comTarefas(
      tarefa({ titulo: "Com processo", processo_numero: "00002668720218130559" }),
    );
    await montar();
    await trocarVisao("Por dia");

    expect(
      (await screen.findAllByText(/^A Fazer · 0000266-87\.2021\.8\.13\.0559$/))[0],
    ).toBeInTheDocument();
  });

  it("coluna que o quadro não conhece some da linha, sem id cru", async () => {
    comTarefas(tarefa({ titulo: "Órfã", coluna_id: "c-que-nao-existe" }));
    await montar();
    await trocarVisao("Por dia");

    await screen.findAllByText("Órfã");
    expect(screen.queryByText(/c-que-nao-existe/)).not.toBeInTheDocument();
  });
});

describe("espera pelos quadros", () => {
  it("NÃO mostra a lista antes dos quadros -- senão risca depois", async () => {
    /* 🔴 O quadro chega depois das tarefas. Renderizar antes escreve a
     * concluída SEM risco e a risca meio segundo depois: no intervalo, a
     * tela afirma o contrário do que é. */
    let liberar: (v: unknown) => void = () => {};
    mocks.listarQuadro.mockReturnValue(new Promise((r) => { liberar = r; }));
    comTarefas(tarefa({ titulo: "Já fiz", coluna_id: "c2" }));

    renderComProviders(<AgendaPage />);
    await screen.findByRole("heading", { name: "Agenda" });

    // Com os quadros pendentes, a tarefa não pode estar na tela.
    await waitFor(() => expect(mocks.listarTarefas).toHaveBeenCalled());
    expect(screen.queryByText("Já fiz")).not.toBeInTheDocument();

    liberar({ colunas: COLUNAS });
    const titulo = (await screen.findAllByText("Já fiz"))[0];
    // E quando aparece, já aparece riscada.
    expect(titulo).toHaveStyle({ textDecoration: "line-through" });
  });
});

describe("cartão de hoje", () => {
  it("mostra as tarefas de HOJE mesmo navegando pra outro mês", async () => {
    /* É o ponto de retorno de quem foi olhar outro mês -- se ele seguisse a
     * navegação, seria só uma segunda cópia da visão principal. */
    comTarefas(tarefa({ titulo: "Coisa de hoje", data: ISO_HOJE }));
    await montar();
    await screen.findByText("Hoje · 19/08/2026");

    await userEvent.click(screen.getByLabelText("Próximo período"));
    await screen.findByText("Setembro de 2026");

    expect(screen.getByText("Hoje · 19/08/2026")).toBeInTheDocument();
    expect(screen.getAllByText("Coisa de hoje").length).toBeGreaterThan(0);
  });

  it("diz quando não há nada hoje", async () => {
    comTarefas(tarefa({ titulo: "Semana que vem", data: "2026-08-26" }));
    await montar();
    expect(await screen.findByText("Nenhuma tarefa para hoje.")).toBeInTheDocument();
  });
});

describe("filtro de pessoa", () => {
  it("'Sem responsável' deixa só as que não têm", async () => {
    comTarefas(
      tarefa({ tarefa_id: "t1", titulo: "Da Ana", responsavel_id: "ana@x.com" }),
      tarefa({ tarefa_id: "t2", titulo: "De ninguém" }),
    );
    await montar();
    await trocarVisao("Por dia");
    await screen.findAllByText("Da Ana");

    /* ⚠️ A pílula virou `Select` (pra ganhar busca, X e os estados de
       espera/falha), então o gatilho não é mais um `button` e as opções são
       `option`, num portal fora da barra -- e não `menuitem`. */
    await userEvent.click(screen.getByText("Todas as pessoas"));
    await userEvent.click(await screen.findByRole("option", { name: "Sem responsável" }));

    await waitFor(() => expect(screen.queryByText("Da Ana")).not.toBeInTheDocument());
    expect(screen.getAllByText("De ninguém").length).toBeGreaterThan(0);
  });
});

describe("erro e espera", () => {
  it("erro na consulta oferece tentar de novo", async () => {
    mocks.listarTarefas.mockRejectedValue(new Error("caiu"));
    renderComProviders(<AgendaPage />);
    expect(
      await screen.findByRole("button", { name: /Tentar de novo/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
  });
});

describe("nova tarefa", () => {
  it("abre com a data do dia à vista, não com hoje", async () => {
    /* Sem isso a tarefa criada olhando outubro nasceria com data de agosto e
     * sumiria da tela em que foi criada. */
    await montar();
    await userEvent.click(screen.getByLabelText("Próximo período"));
    await screen.findByText("Setembro de 2026");

    await userEvent.click(screen.getByRole("button", { name: /Nova tarefa/ }));

    const modal = await screen.findByRole("dialog");
    // 30/08 é o primeiro dia da grade de setembro/2026 (que começa numa terça).
    expect(within(modal).getByText("30/08/2026")).toBeInTheDocument();
  });

  describe("assunto do atendimento vinculado", () => {
    /* 🔴 A Agenda pedia o catálogo INTEIRO de atendimentos pra montar o mapa
     * `id -> assunto`. Como `listar_pagina` no backend relê todos os
     * atendimentos de todos os subgrupos visíveis a cada página, percorrer o
     * catálogo lia a coleção N vezes -- medido em 1.000 atendimentos: 10
     * requisições, 80 Queries, 10.000 itens lidos pra exibir uns 10 assuntos.
     *
     * O custo passa a depender de quantos aparecem na TELA. */

    it("pede só os atendimentos que as tarefas da tela referenciam", async () => {
      comTarefas(
        tarefa({ tarefa_id: "t1", atendimento_id: "at1" }),
        tarefa({ tarefa_id: "t2", atendimento_id: "at2", subgrupo_id: "s2" }),
        tarefa({ tarefa_id: "t3" }), // sem vínculo: não entra no pedido
      );
      mocks.resumosDeAtendimentos.mockResolvedValue({
        resumos: [{ subgrupo_id: "s1", atendimento_id: "at1", assunto: "Rescisão" }],
      });
      await montar();

      await waitFor(() => expect(mocks.resumosDeAtendimentos).toHaveBeenCalled());
      const pedidos = mocks.resumosDeAtendimentos.mock.calls[0][0] as {
        subgrupoId: string;
        atendimentoId: string;
      }[];
      expect(pedidos).toEqual([
        { subgrupoId: "s1", atendimentoId: "at1" },
        { subgrupoId: "s2", atendimentoId: "at2" },
      ]);

      /* 🔴 E NÃO pede o catálogo inteiro -- é o ponto da mudança. */
      expect(mocks.listarAtendimentos).not.toHaveBeenCalled();
    });

    it("o mesmo atendimento em várias tarefas é pedido UMA vez", async () => {
      comTarefas(
        tarefa({ tarefa_id: "t1", atendimento_id: "at1" }),
        tarefa({ tarefa_id: "t2", atendimento_id: "at1" }),
        tarefa({ tarefa_id: "t3", atendimento_id: "at1" }),
      );
      await montar();

      await waitFor(() => expect(mocks.resumosDeAtendimentos).toHaveBeenCalled());
      expect(mocks.resumosDeAtendimentos.mock.calls[0][0]).toHaveLength(1);
    });

    it("sem tarefa vinculada, não pergunta nada", async () => {
      comTarefas(tarefa({ tarefa_id: "t1" }));
      await montar();

      await waitFor(() => expect(mocks.listarTarefas).toHaveBeenCalled());
      expect(mocks.resumosDeAtendimentos).not.toHaveBeenCalled();
    });

    it("atendimento que não voltou some do rótulo em vez de virar id cru", async () => {
      comTarefas(tarefa({ tarefa_id: "t1", atendimento_id: "at-sumido" }));
      mocks.resumosDeAtendimentos.mockResolvedValue({ resumos: [] });
      await montar();

      await waitFor(() => expect(mocks.resumosDeAtendimentos).toHaveBeenCalled());
      expect(screen.queryByText(/at-sumido/)).not.toBeInTheDocument();
    });
  });
});
