import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  lerCatalogoFinanceiro: vi.fn(),
  listarLancamentos: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarContas: vi.fn(),
  listarCentrosDeCusto: vi.fn(),
  papelAtende: vi.fn(),
  criarCategoria: vi.fn(),
  atualizarCategoria: vi.fn(),
  criarConta: vi.fn(),
  atualizarConta: vi.fn(),
  criarCentroDeCusto: vi.fn(),
  atualizarCentroDeCusto: vi.fn(),
  desativarItemFinanceiro: vi.fn(),
  reativarItemFinanceiro: vi.fn(),
}));
vi.mock("../../services", () => mocks);

import { renderComProviders } from "../../test/queryTestUtils";
import FinanceiroPage from "./index";

const CATALOGO = {
  contas: [
    {
      conta_id: "c1",
      nome: "Conta corrente Itaú",
      tipo: "corrente",
      inicio: "2026-01-01",
      saldo_inicial_centavos: 2_500_000,
      saldo_centavos: 3_990_015,
      ativa: true,
      banco: "341",
      agencia: "0412",
      numero: "18335-7",
    },
    {
      conta_id: "c2",
      nome: "Caixa antigo",
      tipo: "outros",
      inicio: "2026-01-01",
      saldo_inicial_centavos: 0,
      saldo_centavos: 0,
      ativa: false,
    },
  ],
  categorias: [
    {
      categoria_id: "cat1",
      nome: "Honorários",
      natureza: "entrada",
      cor: "#1f9d55",
      agrupador_id: "",
      ativa: true,
    },
    {
      categoria_id: "cat2",
      nome: "Impostos",
      natureza: "saida",
      cor: "#152029",
      agrupador_id: "",
      ativa: true,
    },
    {
      categoria_id: "cat3",
      nome: "DAS",
      natureza: "saida",
      cor: "#152029",
      agrupador_id: "cat2",
      ativa: true,
    },
  ],
  centros_de_custo: [{ centro_id: "ce1", nome: "Cível", ativo: true }],
  conta_padrao_id: "c1",
  cores_disponiveis: ["#1f9d55", "#152029"],
};

function montar(rota = "/financeiro") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/financeiro" element={<FinanceiroPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** A tela já na aba do catálogo.
 *
 * ⚠️ A tela NÃO abre nela: a primeira aba é Lançamentos, que é onde se
 * trabalha todo dia. Configurações se mexe uma vez, e por isso é a última.
 * Quem conferir o catálogo precisa dizer a aba -- e é o que a URL faz, o que
 * também prova que `?aba=` é endereçável. */
function montarConfiguracoes() {
  return montar("/financeiro?aba=configuracoes");
}

/** O envelope que a API devolve para as duas listas paginadas.
 *
 * 🔴 As contas e os centros NÃO vêm mais do catálogo: eles têm rota própria,
 * paginada, lida do índice estreito. O catálogo segue trazendo as três
 * listas porque é ele que popula os selects do lançamento -- e é por isso
 * que o mesmo dado aparece nos dois lugares aqui. */
function envelope(chave: string, itens: unknown[]) {
  return { [chave]: itens, pagina: 1, tamanho_pagina: 10, total: itens.length, total_paginas: 1 };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
  mocks.listarLancamentos.mockResolvedValue({
    lancamentos: [
      {
        lancamento_id: "l1",
        tipo: "honorario",
        descricao: "Honorários Alfa",
        valor_centavos: 250000,
        data_vencimento: "2026-09-20",
        situacao: "aberto",
        natureza: "entrada",
        conta_id: "c1",
        categoria_id: "cat1",
        centro_id: "",
        rateio: [{ subgrupo_id: "s1", valor_centavos: 250000 }],
        cliente_id: "",
        contraparte: "Construtora Alfa",
        subgrupo_id: "s1",
        numero_processo: "",
        atendimento_id: "",
        responsavel: "",
        documento_numero: "",
        parcela: "",
        criado_por: "ana@x.com",
        criado_em: "2026-09-01T10:00:00+00:00",
      },
    ],
    totais: {
      a_receber_centavos: 250000, a_receber_quantidade: 1,
      a_pagar_centavos: 0, a_pagar_quantidade: 0,
      atrasado_centavos: 0, atrasado_quantidade: 0,
    },
    pagina: 1, tamanho_pagina: 20, total: 1, total_paginas: 1,
  });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarContas.mockResolvedValue(envelope("contas", CATALOGO.contas));
  mocks.listarCentrosDeCusto.mockResolvedValue(
    envelope("centros_de_custo", CATALOGO.centros_de_custo),
  );
  mocks.criarCategoria.mockResolvedValue({});
  mocks.atualizarCategoria.mockResolvedValue({});
  mocks.criarConta.mockResolvedValue({});
  mocks.atualizarConta.mockResolvedValue({});
  mocks.criarCentroDeCusto.mockResolvedValue({});
  mocks.atualizarCentroDeCusto.mockResolvedValue({});
  mocks.desativarItemFinanceiro.mockResolvedValue({});
  mocks.reativarItemFinanceiro.mockResolvedValue({});
});

/** Abre o modal de nova conta e espera ele estar na tela. */
async function abrirNovaConta() {
  montarConfiguracoes();
  await screen.findByText("Honorários");
  await userEvent.click(screen.getByRole("button", { name: "Contas" }));
  await userEvent.click(await screen.findByRole("button", { name: "+ Nova conta" }));
  return screen.findByRole("dialog");
}

/** Abre o modal de nova categoria e espera ele estar na tela. */
async function abrirNovaCategoria() {
  montarConfiguracoes();
  await screen.findByText("Honorários");
  await userEvent.click(screen.getByRole("button", { name: "+ Nova categoria" }));
  return screen.findByRole("dialog");
}

describe("FinanceiroPage", () => {
  it("mostra o título e o subtítulo do artefato", async () => {
    montar();
    expect(await screen.findByRole("heading", { name: "Financeiro", level: 1 })).toBeVisible();
    expect(
      screen.getByText("Honorários, entradas, saídas e o caixa do escritório."),
    ).toBeVisible();
  });

  it("abre em Categorias, com a natureza de cada uma", async () => {
    montarConfiguracoes();
    expect(await screen.findByText("Honorários")).toBeVisible();
    expect(screen.getByText("Entrada")).toBeVisible();
    expect(screen.getAllByText("Saída")).toHaveLength(2);
  });

  it("marca a categoria agrupadora, que não aceita lançamento", async () => {
    /* 🔴 Precisa estar escrito: agrupadora não recebe lançamento, só soma as
       filhas -- quem não souber vai procurá-la no formulário e não achar. */
    montarConfiguracoes();
    await screen.findByText("Impostos");
    expect(screen.getByText(/agrupador de 1 categoria$/)).toBeVisible();
  });

  it("e o plural do detalhe concorda com a quantidade", async () => {
    /* ⚠️ "agrupador de 1 categorias" era o que saía. Concordância errada é
       gíria de programador vazando para a interface, igual a "2 processo(s)". */
    mocks.lerCatalogoFinanceiro.mockResolvedValue({
      ...CATALOGO,
      categorias: [
        ...CATALOGO.categorias,
        { categoria_id: "cat4", nome: "ISS", natureza: "saida", cor: "#152029",
          agrupador_id: "cat2", ativa: true },
      ],
    });
    montarConfiguracoes();
    await screen.findByText("Impostos");
    expect(screen.getByText(/agrupador de 2 categorias$/)).toBeVisible();
  });

  it("troca de lista pelas pílulas", async () => {
    montarConfiguracoes();
    await screen.findByText("Honorários");
    expect(screen.queryByText("Saldo atual")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Contas" }));
    expect(await screen.findByText("Conta corrente Itaú")).toBeVisible();
    /* ⚠️ UM "Saldo atual": virou CABEÇALHO de coluna. Antes era um rótulo
       repetido em cada linha -- o que a tabela resolve de graça. */
    expect(screen.getAllByText("Saldo atual")).toHaveLength(1);
    expect(screen.queryByText("Honorários")).not.toBeInTheDocument();
  });

  it("formata o saldo em reais e marca a conta padrão", async () => {
    montarConfiguracoes();
    await screen.findByText("Honorários");
    await userEvent.click(screen.getByRole("button", { name: "Contas" }));
    expect(await screen.findByText("R$ 39.900,15")).toBeVisible();
    expect(screen.getByText("Padrão")).toBeVisible();
  });

  it("mostra a conta inativa, apagada, em vez de escondê-la", async () => {
    montarConfiguracoes();
    await screen.findByText("Honorários");
    await userEvent.click(screen.getByRole("button", { name: "Contas" }));
    // 🔴 Some da lista seria pior: o nome continua ocupado, e recriá-la daria
    // um 409 que ninguém entenderia.
    expect(await screen.findByText("Caixa antigo")).toBeVisible();
    expect(screen.getByText(/\(Inativa\)/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Reativar Caixa antigo" })).toBeVisible();
  });

  // ─────────────────────────── quem não pode escrever
  it("esconde as ações de quem não administra, e diz por quê", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montarConfiguracoes();
    await screen.findByText("Honorários");
    expect(screen.queryByRole("button", { name: /^Renomear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Desativar/ })).not.toBeInTheDocument();
    expect(
      screen.getByText("Só quem administra o grupo pode alterar o catálogo."),
    ).toBeVisible();
  });

  it("mostra as ações para quem administra, sem o aviso", async () => {
    /* 🔴 O gesto de editar é a LINHA, como nas outras tabelas do projeto: o
       que fica na linha é o olho de desativar, porque o clique carrega uma
       ação só e estas linhas têm duas. */
    montarConfiguracoes();
    expect(await screen.findByRole("button", { name: "Desativar Honorários" })).toBeVisible();
    expect(
      screen.queryByText("Só quem administra o grupo pode alterar o catálogo."),
    ).not.toBeInTheDocument();
  });

  // ─────────────────────────── caminhos de erro
  it("mostra o erro com 'Tentar de novo', e tenta de novo mesmo", async () => {
    mocks.lerCatalogoFinanceiro.mockRejectedValue(new Error("caiu"));
    montarConfiguracoes();
    expect(
      await screen.findByText("Não foi possível carregar o catálogo do Financeiro."),
    ).toBeVisible();

    mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
    await userEvent.click(screen.getByRole("button", { name: /Tentar de novo/i }));
    expect(await screen.findByText("Honorários")).toBeVisible();
  });

  it("diz que o catálogo não existe quando as três listas vêm vazias", async () => {
    mocks.lerCatalogoFinanceiro.mockResolvedValue({
      ...CATALOGO,
      contas: [],
      categorias: [],
      centros_de_custo: [],
    });
    montarConfiguracoes();
    expect(
      await screen.findByText("O catálogo ainda não foi criado neste escritório."),
    ).toBeVisible();
  });

  it("uma lista vazia entre as três NÃO vira estado vazio da tela toda", async () => {
    // O par negativo do teste acima: sem contas mas com categorias, a tela
    // mostra as categorias -- e a lista de Contas é que abre vazia.
    mocks.lerCatalogoFinanceiro.mockResolvedValue({ ...CATALOGO, contas: [] });
    montarConfiguracoes();
    expect(await screen.findByText("Honorários")).toBeVisible();
    expect(
      screen.queryByText("O catálogo ainda não foi criado neste escritório."),
    ).not.toBeInTheDocument();
  });

  it("lê o catálogo UMA vez para as três listas", async () => {
    montarConfiguracoes();
    await screen.findByText("Honorários");
    await userEvent.click(screen.getByRole("button", { name: "Contas" }));
    await userEvent.click(screen.getByRole("button", { name: "Centros de custo" }));
    await waitFor(() => expect(mocks.lerCatalogoFinanceiro).toHaveBeenCalledTimes(1));
  });

  describe("modal de categoria", () => {
    it("o subcabeçalho conta as categorias e os agrupadores", async () => {
      montarConfiguracoes();
      expect(await screen.findByText("3 categorias · 1 agrupador")).toBeVisible();
    });

    it("nome vazio não salva, e o campo diz o que falta", async () => {
      await abrirNovaCategoria();
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByText("Informe o nome da categoria.")).toBeVisible();
      expect(mocks.criarCategoria).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("salva com nome, natureza, cor e agrupador", async () => {
      await abrirNovaCategoria();
      await userEvent.type(screen.getByLabelText(/Nome/), "Energia elétrica");
      await userEvent.click(screen.getByRole("button", { name: "Cor #152029" }));
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(mocks.criarCategoria).toHaveBeenCalledWith({
          nome: "Energia elétrica",
          natureza: "saida",
          cor: "#152029",
          agrupador_id: "",
        }),
      );
    });

    it("🔴 a paleta marca a cor escolhida, e só ela", async () => {
      await abrirNovaCategoria();
      const primeira = screen.getByRole("button", { name: "Cor #1f9d55" });
      const segunda = screen.getByRole("button", { name: "Cor #152029" });
      expect(primeira).toHaveAttribute("aria-pressed", "true");

      await userEvent.click(segunda);
      expect(segunda).toHaveAttribute("aria-pressed", "true");
      expect(primeira).toHaveAttribute("aria-pressed", "false");
    });

    it("🔴 agrupador de OUTRA natureza não aparece na lista", async () => {
      /* Uma despesa dentro de um agrupador de entrada somaria do lado errado
         do fluxo, e a API recusa -- oferecer aqui seria empurrar para um 400. */
      await abrirNovaCategoria();
      const agrupador = screen.getByLabelText("Agrupador");
      await userEvent.click(agrupador);
      // A natureza nasce em "Saída": só "Impostos" é agrupadora de saída.
      expect(await screen.findByRole("option", { name: "Impostos" })).toBeVisible();
      expect(screen.queryByRole("option", { name: "Honorários" })).not.toBeInTheDocument();
    });

    it("trocar a natureza LIMPA o agrupador escolhido", async () => {
      /* Sem isto, o par natureza+agrupador ia divergente para a API. */
      await abrirNovaCategoria();
      await userEvent.click(screen.getByLabelText("Agrupador"));
      await userEvent.click(await screen.findByRole("option", { name: "Impostos" }));

      await userEvent.click(screen.getByLabelText(/Natureza/));
      await userEvent.click(await screen.findByRole("option", { name: "Entrada" }));

      await userEvent.type(screen.getByLabelText(/Nome/), "Consultoria");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
      await waitFor(() =>
        expect(mocks.criarCategoria).toHaveBeenCalledWith(
          expect.objectContaining({ natureza: "entrada", agrupador_id: "" }),
        ),
      );
    });

    it("🔴 o erro da API fica no modal, que NÃO fecha", async () => {
      const { ApiError } = await import("../../services/api/client");
      mocks.criarCategoria.mockRejectedValue(
        new ApiError("Já existe uma categoria com esse nome", 409),
      );
      await abrirNovaCategoria();
      await userEvent.type(screen.getByLabelText(/Nome/), "Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByText("Já existe uma categoria com esse nome")).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
      // E o que foi digitado continua lá -- é a razão de o modal não fechar.
      expect(screen.getByLabelText(/Nome/)).toHaveValue("Honorários");
    });

    it("🔴 editar mostra cor e agrupador, mas NÃO a natureza", async () => {
      /* A régua do editar no catálogo: muda o que não reescreve história.
         Trocar a natureza inverteria o lado do caixa de tudo já lançado ali,
         e a API responde 422 -- por isso o campo nem aparece. */
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByText("Honorários"));

      expect(await screen.findByRole("dialog")).toBeVisible();
      expect(screen.getByLabelText(/Nome/)).toHaveValue("Honorários");
      expect(screen.getByRole("group", { name: "Cor da categoria" })).toBeVisible();
      expect(screen.getByLabelText("Agrupador")).toBeVisible();
      expect(screen.queryByLabelText(/Natureza/)).not.toBeInTheDocument();
    });

    it("e salva nome, cor e agrupador de uma vez", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByText("Honorários"));
      await screen.findByRole("dialog");
      await userEvent.click(screen.getByRole("button", { name: "Cor #152029" }));
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(mocks.atualizarCategoria).toHaveBeenCalledWith("cat1", {
          nome: "Honorários",
          cor: "#152029",
          agrupador_id: "",
        }),
      );
    });

    it("desativar e reativar chamam o serviço certo", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Desativar Honorários" }));
      await waitFor(() =>
        expect(mocks.desativarItemFinanceiro).toHaveBeenCalledWith("categorias", "cat1"),
      );
    });

    it("quem não administra não vê o botão de criar", async () => {
      mocks.papelAtende.mockReturnValue(false);
      montarConfiguracoes();
      await screen.findByText("Honorários");
      expect(screen.queryByRole("button", { name: "+ Nova categoria" })).not.toBeInTheDocument();
    });
  });

  describe("modal de conta", () => {
    it("o subcabeçalho conta as contas", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Contas" }));
      expect(await screen.findByText("Mostrando 2 de 2 contas")).toBeVisible();
    });

    it("🔴 conta corrente PEDE os dados bancários", async () => {
      await abrirNovaConta();
      expect(screen.getByLabelText(/Banco/)).toBeVisible();
      expect(screen.getByLabelText(/Agência/)).toBeVisible();
      expect(screen.getByLabelText(/Conta \(com dígito\)/)).toBeVisible();
    });

    it("🔴 e 'Outros' ESCONDE os três -- caixa não tem agência", async () => {
      await abrirNovaConta();
      await userEvent.click(screen.getByLabelText(/Tipo/));
      await userEvent.click(await screen.findByRole("option", { name: "Outros" }));

      expect(screen.queryByLabelText(/Banco/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Agência/)).not.toBeInTheDocument();
    });

    it("salva a conta corrente inteira, com o saldo em CENTAVOS", async () => {
      await abrirNovaConta();
      await userEvent.type(screen.getByLabelText(/Nome/), "Conta nova");
      await userEvent.type(screen.getByLabelText(/Saldo inicial/), "1.234,56");
      await userEvent.type(screen.getByLabelText(/Banco/), "341");
      await userEvent.type(screen.getByLabelText(/Agência/), "0412");
      await userEvent.type(screen.getByLabelText(/Conta \(com dígito\)/), "18335-7");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(mocks.criarConta).toHaveBeenCalledWith(
          expect.objectContaining({
            nome: "Conta nova",
            tipo: "corrente",
            saldo_inicial_centavos: 123456,
            banco: "341",
            agencia: "0412",
            numero: "18335-7",
          }),
        ),
      );
    });

    it("sem os obrigatórios não salva, e cada campo diz o que falta", async () => {
      await abrirNovaConta();
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByText("Informe o nome da conta.")).toBeVisible();
      expect(screen.getByText("Informe o saldo em reais.")).toBeVisible();
      expect(screen.getByText("Informe o banco.")).toBeVisible();
      expect(mocks.criarConta).not.toHaveBeenCalled();
    });

    it("saldo que não é número não passa", async () => {
      await abrirNovaConta();
      await userEvent.type(screen.getByLabelText(/Nome/), "Conta nova");
      await userEvent.type(screen.getByLabelText(/Saldo inicial/), "mil reais");
      await userEvent.type(screen.getByLabelText(/Banco/), "341");
      await userEvent.type(screen.getByLabelText(/Agência/), "0412");
      await userEvent.type(screen.getByLabelText(/Conta \(com dígito\)/), "1");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      expect(await screen.findByText("Informe o saldo em reais.")).toBeVisible();
      expect(mocks.criarConta).not.toHaveBeenCalled();
    });

    it("🔴 editar mostra os bancários, mas NÃO tipo, início nem saldo", async () => {
      /* O tipo muda quais campos são obrigatórios num item que já existe; o
         início e o saldo inicial são write-once, porque o saldo ATUAL é
         mantido a partir deles. A API responde 422 nos três. */
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Contas" }));
      await userEvent.click(await screen.findByText("Conta corrente Itaú"));

      expect(await screen.findByRole("dialog")).toBeVisible();
      expect(screen.getByLabelText(/Banco/)).toHaveValue("341");
      expect(screen.queryByLabelText(/Tipo/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Início/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Saldo inicial/)).not.toBeInTheDocument();
    });

    it("e salva nome e bancários, sem os três recusados", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Contas" }));
      await userEvent.click(await screen.findByText("Conta corrente Itaú"));
      const banco = await screen.findByLabelText(/Banco/);
      await userEvent.clear(banco);
      await userEvent.type(banco, "237");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(mocks.atualizarConta).toHaveBeenCalledWith("c1", {
          nome: "Conta corrente Itaú",
          banco: "237",
          agencia: "0412",
          numero: "18335-7",
        }),
      );
    });
  });

  describe("a tabela segue o padrão do projeto", () => {
    it("tem cabeçalho de colunas, como Clientes e Membros", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      expect(screen.getByRole("columnheader", { name: "Categoria" })).toBeVisible();
      expect(screen.getByRole("columnheader", { name: "Natureza" })).toBeVisible();
    });

    it("🔴 o clique no OLHO não abre o modal junto", async () => {
      /* Sem `stopPropagation`, desativar uma categoria abriria o formulário
         de renomeá-la por cima -- dois gestos num clique só. */
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Desativar Honorários" }));

      await waitFor(() => expect(mocks.desativarItemFinanceiro).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("quem não administra tem a linha SEM alvo de teclado", async () => {
      /* Um `tabIndex` que não faz nada é pior que alvo nenhum: quem navega
         por Tab para em cima dele e nada acontece. */
      mocks.papelAtende.mockReturnValue(false);
      montarConfiguracoes();
      await screen.findByText("Honorários");
      const linha = screen.getByText("Honorários").closest("tr");
      expect(linha).not.toHaveAttribute("tabindex");
    });

    it("e quem administra tem", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      expect(screen.getByText("Honorários").closest("tr")).toHaveAttribute("tabindex", "0");
    });
  });

  describe("contas e centros PAGINAM, categorias não", () => {
    /** 🔴 A assimetria é o desenho, não descuido: a ordem das categorias é
     * hierárquica (filha logo abaixo da mãe, indentada) e a quebra de página
     * separaria as duas. Contas e centros são alfabéticos puros. */

    const CONTAS_DEMAIS = Array.from({ length: 11 }, (_, i) => ({
      ...CATALOGO.contas[0],
      conta_id: `c-${i}`,
      nome: `Conta ${String(i).padStart(2, "0")}`,
    }));

    function comOnzeContas() {
      mocks.listarContas.mockImplementation(({ pagina = 1, tamanhoPagina = 10 } = {}) => {
        const inicio = (pagina - 1) * tamanhoPagina;
        return Promise.resolve({
          contas: CONTAS_DEMAIS.slice(inicio, inicio + tamanhoPagina),
          pagina,
          tamanho_pagina: tamanhoPagina,
          total: CONTAS_DEMAIS.length,
          total_paginas: 2,
        });
      });
    }

    async function abrirContas() {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Contas" }));
    }

    it("com 11 contas a barra aparece, e a página 2 traz a última", async () => {
      comOnzeContas();
      await abrirContas();
      await screen.findByText("Conta 00");
      expect(screen.getByText("Mostrando 10 de 11 contas")).toBeInTheDocument();

      await userEvent.click(await screen.findByRole("button", { name: "2" }));
      await waitFor(() => expect(screen.getByText("Conta 10")).toBeInTheDocument());
      expect(screen.queryByText("Conta 00")).not.toBeInTheDocument();
    });

    it("⚠️ o par negativo: com 10 a barra NÃO aparece", async () => {
      /* `Pagination` some sozinho abaixo do menor tamanho de página. Sem
         isto, toda tela de escritório pequeno ganharia um controle que nunca
         teria uma segunda página. */
      mocks.listarContas.mockResolvedValue({
        contas: CONTAS_DEMAIS.slice(0, 10),
        pagina: 1, tamanho_pagina: 10, total: 10, total_paginas: 1,
      });
      await abrirContas();
      await screen.findByText("Conta 00");
      expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
      expect(screen.queryByText("Por página")).not.toBeInTheDocument();
    });

    it("🔴 categorias não pede rota paginada nenhuma", async () => {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      expect(mocks.lerCatalogoFinanceiro).toHaveBeenCalled();
      expect(mocks.listarContas).not.toHaveBeenCalled();
      expect(mocks.listarCentrosDeCusto).not.toHaveBeenCalled();
    });

    it("⚠️ e cada pílula só busca a SUA lista", async () => {
      await abrirContas();
      await screen.findByText("Conta corrente Itaú");
      expect(mocks.listarContas).toHaveBeenCalled();
      expect(mocks.listarCentrosDeCusto).not.toHaveBeenCalled();
    });

    /* ⚠️ A URL é aferida pelo que a API RECEBEU, e não pela string: dentro de
       `MemoryRouter` o endereço não chega ao `window.location`, e é o efeito
       -- qual página foi pedida -- que interessa. Mesmo padrão de
       `ProcessosPage/index.test.tsx`. */
    it("virar a página pede a página 2 ao servidor", async () => {
      comOnzeContas();
      await abrirContas();
      await screen.findByText("Conta 00");

      await userEvent.click(await screen.findByRole("button", { name: "2" }));
      await waitFor(() =>
        expect(mocks.listarContas).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 })),
      );
    });

    it("🔴 trocar de pílula APAGA a página", async () => {
      /* As duas listas dividem um `?pagina=`. Sem esta limpeza, sair da
         página 2 de contas para centros pediria centros na página 2 --
         vazia, e sem nada na tela explicando por quê. */
      comOnzeContas();
      await abrirContas();
      await userEvent.click(await screen.findByRole("button", { name: "2" }));
      await waitFor(() =>
        expect(mocks.listarContas).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 })),
      );

      await userEvent.click(screen.getByRole("button", { name: "Centros de custo" }));
      await waitFor(() => expect(mocks.listarCentrosDeCusto).toHaveBeenCalled());
      expect(mocks.listarCentrosDeCusto).not.toHaveBeenCalledWith(
        expect.objectContaining({ pagina: 2 }),
      );
    });

    it("⚠️ um endereço com seção e página abre direto neles", async () => {
      comOnzeContas();
      montar("/financeiro?aba=configuracoes&secao=contas&pagina=2");
      await screen.findByText("Conta 10");
      expect(screen.queryByText("Conta 00")).not.toBeInTheDocument();
    });

    it("🔴 desativar uma conta releva a PÁGINA, não só o catálogo", async () => {
      /* São três chaves de cache para o mesmo dado. Invalidar só a do
         catálogo atualizava o select do lançamento e deixava a TABELA da
         tela com a lista velha -- defeito que só aparece para quem está com
         a tela aberta na hora. Vai pela linha (o olho), que é a ação que não
         abre modal. */
      await abrirContas();
      await screen.findByText("Conta corrente Itaú");
      mocks.listarContas.mockClear();
      mocks.lerCatalogoFinanceiro.mockClear();

      await userEvent.click(screen.getAllByRole("button", { name: /Desativar/ })[0]);

      await waitFor(() => expect(mocks.desativarItemFinanceiro).toHaveBeenCalled());
      await waitFor(() => expect(mocks.listarContas).toHaveBeenCalled());
      expect(mocks.lerCatalogoFinanceiro).toHaveBeenCalled();
    });

    it("a lista que falha avisa, e não deixa a tela em branco", async () => {
      mocks.listarContas.mockRejectedValue(new Error("caiu"));
      await abrirContas();
      expect(await screen.findByText(/Não foi possível carregar as contas/)).toBeInTheDocument();
    });
  });
});

describe("cada aba mostra o SEU conteúdo", () => {
  /** 🔴 Nenhum teste cobria isto, e o defeito passou: a página renderizava
   * Configurações para toda aba "não pendente", o que funcionava enquanto
   * ela era a única pronta. Marcar Lançamentos como não pendente, antes de a
   * lista existir, fez a aba mostrar a tela de Configurações INTEIRA -- com
   * as três tabelas do catálogo. Quem viu foi o usuário, não a suíte.
   */

  it.each([
    ["faturas", "Faturas"],
    ["fluxo", "Fluxo de caixa"],
  ])("a aba pendente %s diz que ainda não chegou", async (id, rotulo) => {
    montar(`/financeiro?aba=${id}`);
    expect(await screen.findByText(`${rotulo} ainda não está disponível.`)).toBeInTheDocument();
  });

  it("🔴 Lançamentos mostra a LISTA, e não o catálogo -- o par negativo do defeito", async () => {
    /* Esta aba deixou de ser pendente quando a lista e a tela de detalhe
       existiram. É exatamente o momento em que o defeito antigo aparecia:
       "não é pendente, então é Configurações". */
    montar("/financeiro?aba=lancamentos");
    expect(await screen.findByText("Honorários Alfa")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Nova categoria" })).not.toBeInTheDocument();
    expect(
      screen.queryByText("Lançamentos ainda não está disponível."),
    ).not.toBeInTheDocument();
  });

  it("só Configurações traz as três listas", async () => {
    montarConfiguracoes();
    expect(await screen.findByRole("button", { name: "+ Nova categoria" })).toBeInTheDocument();
  });
});
