import { screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { emDias } from "../../utils";
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
    /* 🔴 `coluna_nome` e `esta_concluida` vêm NA tarefa desde 25/08/2026,
       resolvidos pelo servidor. Antes a Agenda pedia um quadro POR SUBGRUPO
       exibido pra descobrir isto -- e só pros 50 primeiros, enquanto a lista
       de tarefas trazia todos os visíveis. */
    coluna_nome: "A Fazer",
    esta_concluida: false,
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

/** ⚠️ Dentro de `MemoryRouter`: a tela passou a ler `useLocation()` -- a
 * Área de trabalho abre ela já no modo atrasadas --, e `useLocation` fora de
 * um Router lança.
 *
 * `periodoInicial` é o que a navegação carrega: é assim que o card "Tarefas
 * atrasadas" chega aqui. */
async function montar(periodoInicial?: "atrasadas") {
  renderComProviders(
    <MemoryRouter
      initialEntries={[
        { pathname: "/agenda", state: periodoInicial ? { periodo: periodoInicial } : undefined },
      ]}
    >
      <AgendaPage />
    </MemoryRouter>,
  );
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

  it("🔴 cada tarefa mostra de qual subgrupo é", async () => {
    /* A Agenda junta, no mesmo dia, as tarefas de TODOS os subgrupos da
       pessoa -- e sem isto duas tarefas de título parecido ficam
       indistinguíveis, que é o relato que originou esta frente.

       ⚠️ Na visão de LISTA, que é onde a linha aparece inteira. Nas visões de
       calendário a tarefa é um bloquinho de dia, sem espaço para etiqueta. */
    comTarefas(tarefa({ tarefa_id: "t1", titulo: "Protocolar réplica", data: ISO_HOJE }));
    await montar();
    await trocarVisao("Em lista");

    /* ⚠️ Escopado à LINHA da tarefa: a etiqueta com este nome aparece também
       na pílula de filtro de subgrupo, e um seletor global casaria com as
       duas -- passando sem provar que a LINHA mostra o subgrupo. */
    /* ⚠️ Escopado ao BOTÃO da tarefa, e por dois motivos: a etiqueta com este
       nome aparece também na pílula de filtro de subgrupo, e o próprio título
       casa duas vezes (o `Text` e um ancestral). O botão é a linha. */
    await screen.findAllByText("Protocolar réplica");
    const linha = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Protocolar réplica"))!;
    expect(within(linha).getByTitle("Cível")).toHaveTextContent("Cível");
  });

  it("⚠️ o par negativo: sem o subgrupo no catálogo, mostra o id -- e não some", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
    comTarefas(tarefa({ tarefa_id: "t1", titulo: "Protocolar réplica", data: ISO_HOJE }));
    await montar();
    await trocarVisao("Em lista");

    await screen.findAllByText("Protocolar réplica");
    const linha = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.includes("Protocolar réplica"))!;
    expect(within(linha).getByTitle("s1")).toHaveTextContent("s1");
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
    comTarefas(tarefa({ titulo: "Já fiz", coluna_nome: "Concluído", esta_concluida: true }));
    await montar();
    await trocarVisao("Por dia");

    const titulo = (await screen.findAllByText("Já fiz"))[0];
    await waitFor(() => expect(titulo).toHaveStyle({ textDecoration: "line-through" }));
  });

  it("tacha a ARQUIVADA também -- arquivada é concluída guardada", async () => {
    comTarefas(tarefa({ titulo: "Guardada", coluna_nome: "Arquivado", esta_concluida: true }));
    await montar();
    await trocarVisao("Por dia");

    const titulo = (await screen.findAllByText("Guardada"))[0];
    await waitFor(() => expect(titulo).toHaveStyle({ textDecoration: "line-through" }));
  });

  it("🔴 NÃO pede quadro nenhum -- e ainda assim tacha certo", async () => {
    /* Esta é a asserção que substituiu duas.

       Saiu daqui "o MESMO id de coluna em quadros diferentes não se
       confunde": cada subgrupo tem o próprio quadro, e nada impede que "c1"
       seja comum num e de conclusão no outro. A garantia não deixou de
       importar -- MUDOU DE LADO. Agora é do servidor, e vive em
       `api/tests/test_campos_derivados.py`.

       Saiu também "NÃO mostra a lista antes dos quadros": não há mais
       quadros a esperar. Os campos chegam na mesma resposta das tarefas, e
       o estado em que a lista está na tela sem eles -- aquele em que a
       Agenda afirmava o contrário do que é -- deixou de existir.

       O que sobra pra guardar aqui é que a tela não voltou a perguntar. */
    comTarefas(tarefa({ titulo: "Já fiz", coluna_nome: "Concluído", esta_concluida: true }));
    await montar();
    await trocarVisao("Por dia");

    const titulo = (await screen.findAllByText("Já fiz"))[0];
    expect(titulo).toHaveStyle({ textDecoration: "line-through" });
    expect(mocks.listarQuadro).not.toHaveBeenCalled();
  });

  it("NÃO tacha a que está numa coluna comum", async () => {
    comTarefas(tarefa({ titulo: "Em aberto" }));
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
    comTarefas(tarefa({ titulo: "Protocolar" }));
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
    comTarefas(tarefa({ titulo: "Órfã", coluna_nome: null }));
    await montar();
    await trocarVisao("Por dia");

    await screen.findAllByText("Órfã");
    expect(screen.queryByText(/c-que-nao-existe/)).not.toBeInTheDocument();
  });
});


describe("coluna na linha", () => {
  it("mostra em que coluna a tarefa está", async () => {
    /* A Agenda não tem colunas -- é a única forma de saber em que pé a
     * tarefa está sem abri-la. É a primeira metade do `meta` do artifact. */
    comTarefas(tarefa({ titulo: "Protocolar" }));
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
    comTarefas(tarefa({ titulo: "Órfã", coluna_nome: null }));
    await montar();
    await trocarVisao("Por dia");

    await screen.findAllByText("Órfã");
    expect(screen.queryByText(/c-que-nao-existe/)).not.toBeInTheDocument();
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
    renderComProviders(
      <MemoryRouter>
        <AgendaPage />
      </MemoryRouter>,
    );
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

describe("modo Atrasadas", () => {
  /* 🔴 O card "Tarefas atrasadas" da Área de trabalho passou um tempo SEM
     link, e não por falta de tela: ele conta abertas com `data < hoje` em
     QUALQUER dia passado, e toda visão da Agenda é limitada por janela de
     datas. Mandar pra cá levaria a uma tela mostrando ZERO das atrasadas --
     pior que link nenhum.

     Este modo é o que faz o clique contar a mesma história que o número. */

  it("troca a FORMA da consulta: sem janela, com apenas abertas", async () => {
    await montar("atrasadas");

    await waitFor(() =>
      expect(mocks.listarTarefas).toHaveBeenCalledWith(
        expect.objectContaining({ apenasAbertas: true }),
      ),
    );
    /* ⚠️ Índice, não `.at(-1)`: o alvo do `tsc` deste projeto não tem
       `Array.prototype.at`, e o vitest transpila diferente -- passaria aqui
       e quebraria no `yarn build`. Mesma armadilha do `useCatalogos.test`. */
    const chamadas = mocks.listarTarefas.mock.calls;
    const [chamada] = chamadas[chamadas.length - 1];
    expect(chamada.dataDe, "a janela da visão não pode ir junto").toBeUndefined();
    expect(chamada.dataAte, "recorta em ontem").toBeTruthy();
  });

  it("desabilita a troca de visão, e diz por quê", async () => {
    await montar("atrasadas");

    const pilula = pilulaDeVisao();
    expect(pilula).toBeDisabled();
    expect(pilula).toHaveAttribute("title", expect.stringContaining("calendário"));
  });

  it("some com as setas e o 'Hoje' -- navegar período não muda nada", async () => {
    await montar("atrasadas");

    expect(screen.queryByRole("button", { name: "Período anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próximo período" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Hoje" })).not.toBeInTheDocument();
  });

  it("🔴 mas MANTÉM o rótulo, dizendo o que está na tela", async () => {
    /* Ele some junto seria perder a única frase que explica a lista. Ficar
       com o mês navegado seria pior: "Agosto de 2026" sobre tarefas de julho
       é a tela afirmando o contrário do que é. */
    await montar("atrasadas");

    expect(await screen.findByText(/^Atrasadas — até /)).toBeInTheDocument();
    expect(screen.queryByText(/^Agosto de/)).not.toBeInTheDocument();
  });

  it("lista os dias que VIERAM, não os próximos catorze", async () => {
    /* A visão em lista monta 14 dias pra frente a partir da data visível --
       nenhum deles conteria uma tarefa atrasada, que está no passado. */
    comTarefas(
      tarefa({ tarefa_id: "t1", titulo: "De ontem", data: emDias(-1) }),
      tarefa({ tarefa_id: "t2", titulo: "De um mês atrás", data: emDias(-30) }),
    );
    await montar("atrasadas");

    expect(await screen.findByText("De um mês atrás")).toBeInTheDocument();
    expect(screen.getByText("De ontem")).toBeInTheDocument();
  });

  it("o vazio fala de atrasadas, não de 'próximos 14 dias'", async () => {
    comTarefas();
    await montar("atrasadas");

    expect(await screen.findByText("Nenhuma tarefa atrasada.")).toBeInTheDocument();
  });

  it("🔴 o período entra na CHAVE de cache", async () => {
    /* Sem isso, ligar "Atrasadas" reusaria o resultado da janela anterior --
       lista errada, sem erro nenhum. */
    const user = userEvent.setup();
    await montar();
    const antes = mocks.listarTarefas.mock.calls.length;

    /* ⚠️ A pílula é um `Select` (variante chip), como a de pessoas: o
       gatilho não é `button` e as opções são `option`, num portal. */
    await user.click(screen.getByText("Todos os períodos"));
    await user.click(await screen.findByRole("option", { name: "Atrasadas" }));

    await waitFor(() => expect(mocks.listarTarefas.mock.calls.length).toBeGreaterThan(antes));
  });
});

describe("modo Atrasadas: a pílula de visão não pode mentir", () => {
  /* 🔴 Achado da auditoria de 26/08/2026, e pelos DOIS caminhos.
     O modo renderiza a lista ignorando o calendário. Se `visao` continuasse
     "mes", a pílula -- desabilitada -- exibiria "Por mês" sobre uma lista
     corrida: rótulo dizendo uma coisa e conteúdo sendo outra, que é o
     defeito que esta tela acabou de perder. */

  it("chegando da Área de trabalho, a visão já nasce em lista", async () => {
    await montar("atrasadas");
    expect(pilulaDeVisao()).toHaveTextContent("Em lista");
  });

  it("ligando a pílula aqui dentro, a visão troca junto", async () => {
    const user = userEvent.setup();
    await montar();
    expect(pilulaDeVisao()).toHaveTextContent("Por mês");

    await user.click(screen.getByText("Todos os períodos"));
    await user.click(await screen.findByRole("option", { name: "Atrasadas" }));

    await waitFor(() => expect(pilulaDeVisao()).toHaveTextContent("Em lista"));
  });
});

describe("modo Atrasadas: o cartão 'Hoje' não pode afirmar o que não sabe", () => {
  it("🔴 não diz 'Nenhuma tarefa para hoje' -- ele não perguntou por hoje", async () => {
    /* Achado da segunda auditoria de 26/08/2026. A consulta do modo pede
       `data_ate: ontem`, então as tarefas de hoje NUNCA chegam. O cartão
       lateral montava a frase em cima desse conjunto e afirmava zero -- a
       pessoa podia ter cinco vencendo hoje.

       Lista vazia sem dizer por quê é justamente o que este projeto
       persegue; aqui o porquê é o próprio filtro. */
    comTarefas(tarefa({ titulo: "Atrasada", data: emDias(-2) }));
    await montar("atrasadas");

    expect(screen.queryByText("Nenhuma tarefa para hoje.")).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Em Atrasadas a lista traz só o passado/),
    ).toBeInTheDocument();
  });

  it("🔴 ESCONDE a lista de pessoas de quem é `user`, e mantém 'Sem responsável'", async () => {
    /* `GET /grupos/membros` tem piso `manager`: pra um `user` ela responde
       403. Uma opção que falha é pior que uma ausente -- o princípio que
       `podeDestruirDocumento` já escreve nesta base.

       ⚠️ O par importa: escondendo a pílula INTEIRA, quem é `user` perderia
       "Sem responsável", que não depende daquela rota e é filtro de verdade
       (não é ausência de filtro, é filtro por ausência).

       ⚠️ Procurado por ROLE: "Sem responsável" também aparece em cartões da
       agenda, e buscar por texto casaria com os dois. */
    const user = userEvent.setup();
    mocks.papelAtende.mockReturnValue(false);
    renderComProviders(<MemoryRouter><AgendaPage /></MemoryRouter>);
    await screen.findByText("Todas as pessoas");

    await user.click(screen.getByText("Todas as pessoas"));
    expect(await screen.findByRole("option", { name: "Sem responsável" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Ana" })).not.toBeInTheDocument();
  });

  it("oferece a lista de pessoas pra manager+", async () => {
    const user = userEvent.setup();
    mocks.papelAtende.mockReturnValue(true);
    renderComProviders(<MemoryRouter><AgendaPage /></MemoryRouter>);
    await screen.findByText("Todas as pessoas");

    await user.click(screen.getByText("Todas as pessoas"));
    expect(await screen.findByRole("option", { name: "Ana" })).toBeInTheDocument();
  });
});
