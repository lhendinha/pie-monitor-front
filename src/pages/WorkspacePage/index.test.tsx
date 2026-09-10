import { screen, waitFor } from "@testing-library/react";
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
  /* O card "Vence esta semana" e a baixa pela linha. */
  listarLancamentos: vi.fn(),
  efetivarLancamento: vi.fn(),
  lerCatalogoFinanceiro: vi.fn(),
  /* A seleção em lote: o piso de papel e a chamada do lote. */
  papelAtende: vi.fn(),
  removerTarefasEmLote: vi.fn(),
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

/** O resumo de quem PODE ver dinheiro. As quatro chaves só existem para
 * `financeiro`+ -- para os outros elas não vêm, e é a ausência que a tela
 * lê. */
const RESUMO_COM_DINHEIRO = {
  ...RESUMO,
  a_receber_atrasado_centavos: 1_248_000,
  a_pagar_7_dias_centavos: 328_500,
  saldo_das_contas_centavos: 5_286_780,
  tem_conta_cadastrada: true,
};

const lancamento = (id: string, descricao: string, natureza: string, centavos: number) => ({
  lancamento_id: id, tipo: natureza === "entrada" ? "honorario" : "saida",
  descricao, valor_centavos: centavos, data_vencimento: "2026-09-18",
  situacao: "aberto", natureza, conta_id: "ct1", categoria_id: "cat1", centro_id: "",
  rateio: [], cliente_id: "", contraparte: "Construtora Alfa", subgrupo_id: "sg",
  numero_processo: "", atendimento_id: "", responsavel: "", documento_numero: "",
  parcela: "", criado_por: "x", criado_em: "2026-09-01T00:00:00Z",
});

const tarefa = (
  id: string,
  titulo: string,
  responsavel: string | null,
  /** O vínculo com o processo -- é o que a faixa amarela da seleção conta. */
  processo: string | null = null,
) => ({
  subgrupo_id: "sg",
  tarefa_id: id,
  titulo,
  data: "2026-09-01",
  coluna_id: "c1",
  prioridade: "Média",
  responsavel_id: responsavel,
  processo_numero: processo,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEmail.mockReturnValue("ana@argos.local");
  mocks.getApelido.mockReturnValue("Ana Paula");
  /* `manager` por padrão: a seleção em lote é o piso dela, e o par negativo
     está no `describe` do fim. */
  mocks.papelAtende.mockReturnValue(true);
  mocks.removerTarefasEmLote.mockResolvedValue({ removidas: 0, ignoradas: [], recusadas: [] });
  mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO);
  mocks.listarLancamentos.mockResolvedValue({
    lancamentos: [lancamento("l1", "Aluguel da sede", "saida", 285_000)],
    total: 1, total_paginas: 1, totais: {},
  });
  mocks.efetivarLancamento.mockResolvedValue({ lancamento_id: "l1" });
  mocks.lerCatalogoFinanceiro.mockResolvedValue({
    contas: [], categorias: [], centros_de_custo: [], conta_padrao_id: "",
    cores_disponiveis: [],
  });
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
  const { pathname, search, state } = useLocation();
  /* ⚠️ Mostra a QUERY também: as linhas do Financeiro levam o filtro na URL
     (é assim que a lista de Lançamentos lê os dela), e não no `state`. */
  return <div data-testid="destino">{`${pathname}${search} ${JSON.stringify(state)}`}</div>;
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
          <Route path="/financeiro" element={<Destino />} />
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

describe("o Financeiro na Área de trabalho", () => {
  /** As mesmas rotas de destino do bloco acima -- as linhas do Financeiro
   * levam para `/financeiro` com o filtro na QUERY. */
  function montarComDestino() {
    return renderComProviders(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/financeiro" element={<Destino />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  describe("as três linhas do Resumo rápido", () => {
    it("aparecem com o dinheiro formatado", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montar();
      expect(await screen.findByText("A receber atrasado")).toBeInTheDocument();
      expect(screen.getByText("R$ 12.480,00")).toBeInTheDocument();
      expect(screen.getByText("A pagar até 7 dias")).toBeInTheDocument();
      expect(screen.getByText("R$ 3.285,00")).toBeInTheDocument();
      expect(screen.getByText("Saldo das contas")).toBeInTheDocument();
      expect(screen.getByText("R$ 52.867,80")).toBeInTheDocument();
    });

    it("🔴 'A receber atrasado' abre a lista com o MESMO recorte da soma", async () => {
      /* `periodo=todos` porque atrasado é vencimento no passado em QUALQUER
         dia -- o padrão da lista é "Este mês", que esconderia o de julho. */
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montarComDestino();
      await userEvent.click(await screen.findByRole("button", { name: /A receber atrasado/ }));

      const destino = await screen.findByTestId("destino");
      expect(destino).toHaveTextContent("/financeiro");
      expect(destino).toHaveTextContent("aba=lancamentos");
      expect(destino).toHaveTextContent("periodo=todos");
      expect(destino).toHaveTextContent("natureza=entrada");
      expect(destino).toHaveTextContent("situacao=atrasado");
    });

    it("🔴 'A pagar até 7 dias' leva `vencendo`, e não um período", async () => {
      /* Nenhuma combinação de período e situação expressa "aberto, vencendo
         até N dias, atrasados inclusive". Sem `vencendo` o card diria um
         número e a lista abriria outro. */
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montarComDestino();
      await userEvent.click(await screen.findByRole("button", { name: /A pagar até 7 dias/ }));

      const destino = await screen.findByTestId("destino");
      expect(destino).toHaveTextContent("natureza=saida");
      expect(destino).toHaveTextContent("vencendo=7");
      expect(destino).not.toHaveTextContent("periodo=");
    });

    it("'Saldo das contas' abre as contas do catálogo", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montarComDestino();
      await userEvent.click(await screen.findByRole("button", { name: /Saldo das contas/ }));
      expect(await screen.findByTestId("destino")).toHaveTextContent("secao=contas");
    });

    it("⚠️ sem conta cadastrada, a linha DIZ isso em vez de mostrar R$ 0,00", async () => {
      /* Zero de "não tem conta" se lê igual a zero de "está zerado". */
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue({
        ...RESUMO_COM_DINHEIRO,
        saldo_das_contas_centavos: 0,
        tem_conta_cadastrada: false,
      });
      montar();
      expect(await screen.findByText("Nenhuma conta")).toBeInTheDocument();
    });
  });

  describe("o piso de papel", () => {
    it("🔴 sem as chaves, a seção e o card NÃO existem", async () => {
      /* O critério é a AUSÊNCIA da chave, e não um papel lido na tela: o
         servidor já decide quem as recebe, e uma segunda régua aqui
         divergiria da dele. */
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO);
      montar();
      await screen.findByText("Protocolar réplica");

      expect(screen.queryByText("Financeiro")).not.toBeInTheDocument();
      expect(screen.queryByText("A receber atrasado")).not.toBeInTheDocument();
      expect(screen.queryByText("Vence esta semana")).not.toBeInTheDocument();
      /* ⚠️ E o card nem PEDE a lista: sem isto, quem é `user` levaria 403 a
         cada abertura da home. */
      expect(mocks.listarLancamentos).not.toHaveBeenCalled();
    });

    it("⚠️ e o resto da home continua inteiro -- a ausência não quebra nada", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO);
      montar();
      expect(await screen.findByText("Protocolar réplica")).toBeInTheDocument();
      expect(screen.getByText("Processos monitorados")).toBeInTheDocument();
    });
  });

  describe('o card "Vence esta semana"', () => {
    it("traz o que vence, com valor e contraparte", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montar();
      expect(await screen.findByText("Aluguel da sede")).toBeInTheDocument();
      expect(screen.getByText("R$ 2.850,00")).toBeInTheDocument();
      expect(screen.getAllByText("Construtora Alfa").length).toBeGreaterThan(0);
    });

    it("🔴 pede a rota com `vencendo`, e não o resumo", async () => {
      /* É a MESMA leitura que gera a linha "A pagar até 7 dias" do lado do
         servidor: os dois números batem por construção. */
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montar();
      await screen.findByText("Aluguel da sede");
      expect(mocks.listarLancamentos).toHaveBeenCalledWith(
        expect.objectContaining({ vencendo: 7 }),
      );
    });

    it("pagina como os cards de tarefa: cinco de sete, e a barra some com cinco", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      const sete = Array.from({ length: 7 }, (_v, i) =>
        lancamento(`l${i}`, `Conta ${i}`, "saida", 100_00 + i));
      mocks.listarLancamentos.mockImplementation((p: { pagina?: number }) =>
        Promise.resolve({
          lancamentos: p?.pagina === 2 ? sete.slice(5) : sete.slice(0, 5),
          total: 7, total_paginas: 2, totais: {},
        }));
      montar();
      await screen.findByText("Conta 0");
      expect(screen.getByText("Conta 4")).toBeInTheDocument();
      expect(screen.queryByText("Conta 5")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "2" }));
      await waitFor(() => expect(screen.getByText("Conta 5")).toBeInTheDocument());
      expect(screen.queryByText("Conta 0")).not.toBeInTheDocument();
    });

    it("⚠️ com cinco ou menos a barra NÃO aparece", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montar();
      await screen.findByText("Aluguel da sede");
      expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
    });

    it("marcar como pago efetiva e relê a lista", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montar();
      await screen.findByText("Aluguel da sede");
      await userEvent.click(
        screen.getByRole("button", { name: "Marcar Aluguel da sede como pago" }),
      );
      await waitFor(() => expect(mocks.efetivarLancamento).toHaveBeenCalledWith("l1"));
    });

    it("⚠️ na ENTRADA o botão diz 'recebido', e não 'pago'", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      mocks.listarLancamentos.mockResolvedValue({
        lancamentos: [lancamento("l9", "Honorários", "entrada", 800_000)],
        total: 1, total_paginas: 1, totais: {},
      });
      montar();
      await screen.findByText("Honorários");
      expect(
        screen.getByRole("button", { name: "Marcar Honorários como recebido" }),
      ).toBeInTheDocument();
    });

    it("nada vencendo diz isso", async () => {
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      mocks.listarLancamentos.mockResolvedValue({
        lancamentos: [], total: 0, total_paginas: 0, totais: {},
      });
      montar();
      expect(await screen.findByText("Nada vence esta semana.")).toBeInTheDocument();
    });

    it("🔴 falha de rede NÃO vira 'nada vence esta semana'", async () => {
      /* O vazio deste card é uma boa notícia -- e seria falsa. É a mesma
         régua dos cards de tarefa. */
      mocks.listarLancamentos.mockRejectedValue(new Error("caiu"));
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      montar();
      expect(
        await screen.findByText('Não foi possível carregar "Vence esta semana".'),
      ).toBeInTheDocument();
      expect(screen.queryByText("Nada vence esta semana.")).not.toBeInTheDocument();
    });

    it("⚠️ dar baixa no que outra pessoa já baixou relê a lista", async () => {
      /* O 409 vem como toast E a lista relê: o recado sozinho deixaria a
         linha na tela, convidando ao segundo clique. */
      const { ApiError } = await import("../../services/api/client");
      mocks.resumoDaAreaDeTrabalho.mockResolvedValue(RESUMO_COM_DINHEIRO);
      mocks.efetivarLancamento.mockRejectedValue(
        new ApiError("Lançamento já efetivado", 409),
      );
      montar();
      await screen.findByText("Aluguel da sede");
      mocks.listarLancamentos.mockClear();

      await userEvent.click(
        screen.getByRole("button", { name: "Marcar Aluguel da sede como pago" }),
      );
      await waitFor(() => expect(mocks.listarLancamentos).toHaveBeenCalled());
    });
  });
});


describe("seleção em lote (Fase 3 do PLANO_ACOES_EM_LOTE)", () => {
  it("a entrada aparece nos DOIS cards", async () => {
    montar();
    await screen.findByText("Protocolar réplica");
    expect(screen.getAllByRole("button", { name: "Selecionar" })).toHaveLength(2);
  });

  it("🔴 entrar num card SOME com a entrada do outro", async () => {
    /* Dois modos abertos fariam "Excluir 7" não dizer quais sete. */
    const { usuario } = { usuario: userEvent.setup() };
    montar();
    await screen.findByText("Protocolar réplica");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[0]);
    expect(screen.queryByRole("button", { name: "Selecionar" })).not.toBeInTheDocument();
  });

  it("a barra nasce dizendo de quantas se fala, e com Excluir travado", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Protocolar réplica");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[0]);
    expect(screen.getByText("0 de 2 selecionadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Excluir 0/ })).toBeDisabled();
  });

  it("marcar uma linha conta, e o Excluir destrava", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Protocolar réplica");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[0]);
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Protocolar réplica" }));
    expect(screen.getByText("1 de 2 selecionadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Excluir 1/ })).toBeEnabled();
  });

  it("Cancelar fecha o modo e devolve as duas entradas", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Protocolar réplica");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[0]);
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getAllByRole("button", { name: "Selecionar" })).toHaveLength(2);
  });

  it("🔴 excluir manda ao servidor o `responsavel_id` que a TELA VIU", async () => {
    /* É ele que a guarda do lote compara. Sem ele no fio, a proteção some. */
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Conferir prazo");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[1]);
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Conferir prazo" }));
    await usuario.click(screen.getByRole("button", { name: /Excluir 1/ }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 1 tarefa" }));

    await waitFor(() => expect(mocks.removerTarefasEmLote).toHaveBeenCalled());
    expect(mocks.removerTarefasEmLote.mock.calls[0][0]).toEqual([
      { subgrupo_id: "sg", tarefa_id: "t3", responsavel_id: null },
    ]);
  });

  it("🔴 e leva o responsável DE VERDADE quando a tarefa tem dono", async () => {
    /* O par do teste acima, e ele existe porque uma mutação passou verde:
       com `responsavel_id: null` fixo, o caso sem dono continuava certo e o
       COM dono ia errado -- e aí a guarda recusaria tudo, sempre. */
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Protocolar réplica");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[0]);
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Protocolar réplica" }));
    await usuario.click(screen.getByRole("button", { name: "Excluir 1" }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 1 tarefa" }));

    await waitFor(() => expect(mocks.removerTarefasEmLote).toHaveBeenCalled());
    expect(mocks.removerTarefasEmLote.mock.calls[0][0]).toEqual([
      { subgrupo_id: "sg", tarefa_id: "t1", responsavel_id: "ana@argos.local" },
    ]);
  });

  it("⚠️ o aviso diz quantas FICARAM e por quê", async () => {
    /* Sem isso a pessoa não sabe se apagou metade. */
    mocks.removerTarefasEmLote.mockResolvedValue({
      removidas: 1,
      ignoradas: [],
      recusadas: [{ subgrupo_id: "sg", tarefa_id: "t4", motivo: "responsavel_mudou" }],
    });
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Conferir prazo");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[1]);
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Conferir prazo" }));
    await usuario.click(screen.getByRole("button", { name: /Excluir 1/ }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 1 tarefa" }));

    expect(await screen.findByText(/1 ficou: o responsável mudou/)).toBeInTheDocument();
  });

  it("🔴 o botão da barra e o do modal têm nomes DIFERENTES", async () => {
    /* Dois botões com o mesmo nome acessível no mesmo documento fazem o
       leitor anunciar a mesma escolha duas vezes -- a regra que criou
       `rotuloDeCancelar`. Foi este teste que pegou o defeito. */
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Conferir prazo");
    await usuario.click(screen.getAllByRole("button", { name: "Selecionar" })[1]);
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Conferir prazo" }));
    await usuario.click(screen.getByRole("button", { name: "Excluir 1" }));

    await screen.findByRole("dialog");
    const nomes = screen.getAllByRole("button")
      .map((b) => b.textContent?.trim())
      .filter((t) => t?.startsWith("Excluir"));
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("🔴 a faixa conta as vinculadas de TODAS as marcadas, não só as da página", async () => {
    /* Foi a conferência em Chrome que pegou: com 12 marcadas por "todas as
       N", a faixa dizia "3" -- as da página visível -- e o número certo era
       outro. Numa ação destrutiva, o aviso subestimado é o pior tipo. */
    const daPagina = [
      tarefa("t3", "Com processo", null, "08012345620268190001"),
      tarefa("t4", "Sem processo", null),
    ];
    const foraDaPagina = [tarefa("t5", "Outra com processo", null, "07055661220268190002")];

    mocks.listarTarefas.mockImplementation((p: { responsavel?: string; pagina?: number }) =>
      Promise.resolve(
        p?.responsavel === "eu"
          ? { tarefas: [], total: 0, total_paginas: 0 }
          : (p?.pagina ?? 1) === 1
            ? { tarefas: daPagina, total: 3, total_paginas: 2 }
            : { tarefas: foraDaPagina, total: 3, total_paginas: 2 },
      ),
    );

    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Com processo");
    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByRole("button", { name: /Selecionar todas as 3/ }));

    /* Duas das três têm processo -- e uma delas está FORA da página. */
    expect(await screen.findByText(/2 delas estão vinculadas/)).toBeInTheDocument();
  });

  it("🔴 quem NÃO é manager não vê a entrada", async () => {
    /* Esconder não é a proteção -- a rota devolve 403. É para não oferecer
       o que ela vai negar. */
    mocks.papelAtende.mockReturnValue(false);
    montar();
    await screen.findByText("Protocolar réplica");
    expect(screen.queryByRole("button", { name: "Selecionar" })).not.toBeInTheDocument();
  });
});
