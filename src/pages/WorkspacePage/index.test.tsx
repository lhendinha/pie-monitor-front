import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  getEmail: vi.fn(),
  getApelido: vi.fn(),
  resumoDaAreaDeTrabalho: vi.fn(),
  listarTarefas: vi.fn(),
  listarQuadro: vi.fn(),
  atualizarTarefa: vi.fn(),
  /* ⚠️ Entrou quando a linha passou a mostrar o subgrupo: sem mock, o
     catálogo era uma chamada de rede de verdade dentro do teste. */
  listarSubgrupos: vi.fn(),
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

describe("o subgrupo na linha", () => {
  it("🔴 cada tarefa mostra de qual subgrupo é", async () => {
    /* A Área de trabalho mistura tarefas de TODOS os subgrupos, inclusive as
       "disponíveis para assumir". Assumir uma tarefa sem saber de onde ela vem
       é o caso mais caro desta frente.

       ⚠️ A etiqueta fica na linha de APOIO, junto do número do processo, e não
       no bloco da direita: aquele é o par "responsável + prazo", deliberado --
       quem é dono e quando vence se leem juntos. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "sg", nome: "Cível", grupo_id: "g1" }],
    });
    montar();
    await screen.findByText("Protocolar réplica");

    expect(await screen.findAllByTitle("Cível")).not.toHaveLength(0);
  });

  it("⚠️ o par negativo: sem o subgrupo no catálogo, mostra o id -- e não some", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
    montar();
    await screen.findByText("Protocolar réplica");

    expect(await screen.findAllByTitle("sg")).not.toHaveLength(0);
  });
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

/** Rota de mentira que revela pra onde a navegação foi, e com que estado. */
function Destino() {
  const { pathname, state } = useLocation();
  return <div data-testid="destino">{`${pathname} ${JSON.stringify(state)}`}</div>;
}

describe("cada número leva à lista que o gerou", () => {
  /* 🔴 Três números da home ficaram SEM link por inércia: os comentários
     diziam "Kanban ainda não existe" e "Atendimentos ainda não tem tela".
     As telas passaram a existir e ninguém voltou lá.

     A régua deste cartão é o cabeçalho de `ResumoRapido`: o clique aplica
     EXATAMENTE o filtro da contagem. Link que leva a uma lista diferente do
     número clicado é pior que link nenhum -- a pessoa deixa de confiar nos
     dois. */

  /** Monta com uma rota de destino que mostra pra onde foi E com que estado.
   *
   * ⚠️ Sem espião de `useNavigate`: aqui a navegação é a de verdade, dentro
   * do `MemoryRouter`, e o que se afirma é o RESULTADO -- a rota que abriu e
   * o filtro que chegou nela. Um espião provaria que a função foi chamada;
   * isto prova que a pessoa chegou onde o número prometeu. */
  function montarComDestino() {
    return renderComProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/atendimentos" element={<Destino />} />
          <Route path="/processos" element={<Destino />} />
          <Route path="/agenda" element={<Destino />} />
          <Route path="/historico" element={<Destino />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("'Atendimentos em andamento' abre a tela já filtrada por esse status", async () => {
    mocks.resumoDaAreaDeTrabalho.mockResolvedValue({ ...RESUMO, atendimentos_em_andamento: 4 });
    montarComDestino();

    await userEvent.click(await screen.findByRole("button", { name: /Atendimentos em andamento/ }));
    expect(await screen.findByTestId("destino")).toHaveTextContent(
      '/atendimentos {"status":"Em andamento"}',
    );
  });

  it("'Tarefas sem responsável' aponta pra lista que já está NESTA tela", async () => {
    /* O card "Disponíveis para assumir" usa o mesmo filtro da contagem
       (`semResponsavel` + apenas abertas). Não navega: rola e destaca -- a
       lista já está a poucos centímetros. */
    mocks.resumoDaAreaDeTrabalho.mockResolvedValue({ ...RESUMO, tarefas_sem_responsavel: 2 });
    montarComDestino();

    await userEvent.click(await screen.findByRole("button", { name: /Tarefas sem responsável/ }));
    expect(screen.queryByTestId("destino")).not.toBeInTheDocument();
    expect(screen.getByText("Disponíveis para assumir")).toBeInTheDocument();
  });

  it("'Tarefas atrasadas' abre a Agenda no modo atrasadas", async () => {
    /* ⚠️ Aqui havia o teste inverso, afirmando que este número NÃO tinha
       link -- e ele pedia, por escrito, que quem lhe desse destino apagasse
       o teste e explicasse o porquê. É o que esta linha é.

       O motivo de não ter link era real: "atrasadas" é `data < hoje` em
       QUALQUER dia passado, e toda visão da Agenda é limitada por janela de
       datas. Mandar pra lá levava a uma tela mostrando ZERO delas.

       Em 26/08/2026 a Agenda ganhou um MODO: a pílula "Todos os períodos"
       com a opção "Atrasadas" ignora a janela, trava a visão em lista e some
       com a navegação de datas. O destino passou a contar a mesma história
       que o número -- e só por isso o link existe. */
    mocks.resumoDaAreaDeTrabalho.mockResolvedValue({ ...RESUMO, tarefas_atrasadas: 7 });
    montarComDestino();

    await userEvent.click(await screen.findByRole("button", { name: /Tarefas atrasadas/ }));
    expect(await screen.findByTestId("destino")).toHaveTextContent(
      '/agenda {"periodo":"atrasadas"}',
    );
  });

  it("'Envios com falha' e 'Movimentações' abrem o Histórico já filtrado", async () => {
    /* 🔴 Medido em 26/08/2026: o primeiro dizia 2 e abria 6; o segundo dizia
       3 e abria 4. O Histórico não tinha filtro de falha nem de data.
       A falha cruza os DOIS tipos de envio, daí `tipoEnvio: ""`. */
    mocks.resumoDaAreaDeTrabalho.mockResolvedValue({
      ...RESUMO, envios_com_falha: 2, movimentacoes_7_dias: 3,
    });
    montarComDestino();

    await userEvent.click(await screen.findByRole("button", { name: /Envios com falha/ }));
    expect(await screen.findByTestId("destino")).toHaveTextContent(
      '/historico {"tipoEnvio":"","apenasComFalha":true}',
    );
  });

  it("🔴 as duas linhas de PRAZO abrem a lista filtrada por 'eu'", async () => {
    /* O servidor conta OS MEUS nesses dois números desde 26/08/2026. Sem o
       filtro no clique, o cartão diria 2 e a lista abriria 9 -- o defeito de
       que `resumo_service.montar` já se protege: "o número do card não
       bateria com a lista que o clique abre".

       ⚠️ O valor que viaja é o SENTINELA (`__eu__`), não o e-mail: quem
       traduz é `useFiltrosProcessos`, e mandar o e-mail daqui duplicaria essa
       regra em duas telas. */
    const user = userEvent.setup();
    mocks.resumoDaAreaDeTrabalho.mockResolvedValue({ ...RESUMO, a_verificar_ate_hoje: 3 });
    montarComDestino();

    await user.click(await screen.findByText("A verificar até hoje"));

    const destino = await screen.findByTestId("destino");
    expect(destino).toHaveTextContent("/processos");
    expect(destino).toHaveTextContent('"responsavelId":"__eu__"');
    expect(destino).toHaveTextContent('"dataVerificarAte"');
  });
});
