import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  lerCatalogoFinanceiro: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
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
    expect(screen.getAllByText("Saldo atual")).toHaveLength(2);
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
    montarConfiguracoes();
    expect(await screen.findByRole("button", { name: "Renomear Honorários" })).toBeVisible();
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

    it("renomear mostra só o NOME -- natureza e cor não se editam", async () => {
      /* Trocá-las reescreveria lançamentos já gravados: uma categoria que vira
         de saída para entrada muda o lado do caixa de tudo que já usou ela. */
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Renomear Honorários" }));

      expect(await screen.findByRole("dialog")).toBeVisible();
      expect(screen.getByLabelText(/Nome/)).toHaveValue("Honorários");
      expect(screen.queryByLabelText("Natureza")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Agrupador")).not.toBeInTheDocument();
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

    it("🔴 renomear manda SÓ o nome -- mandar o tipo junto é 422", async () => {
      /* Medido contra a API: o PATCH do catálogo é `RenomearItemRequest` com
         `extra="forbid"`, e responde "tipo: Campo não reconhecido". */
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Contas" }));
      await userEvent.click(
        await screen.findByRole("button", { name: "Renomear Conta corrente Itaú" }),
      );
      const nome = await screen.findByLabelText(/Nome/);
      await userEvent.clear(nome);
      await userEvent.type(nome, "Itaú principal");
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() =>
        expect(mocks.atualizarConta).toHaveBeenCalledWith("c1", { nome: "Itaú principal" }),
      );
      expect(screen.queryByLabelText(/Tipo/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Saldo inicial/)).not.toBeInTheDocument();
    });
  });

  describe("centro de custo, que nasce inline", () => {
    async function abrirCentros() {
      montarConfiguracoes();
      await screen.findByText("Honorários");
      await userEvent.click(screen.getByRole("button", { name: "Centros de custo" }));
      return screen.findByText("Cível");
    }

    it("não tem botão no subcabeçalho -- o criar está no cartão", async () => {
      /* Dois lugares para criar a mesma coisa seria a pergunta "qual dos
         dois?" em toda visita. */
      await abrirCentros();
      expect(screen.queryByRole("button", { name: /\+ Novo centro/ })).not.toBeInTheDocument();
      expect(screen.getByLabelText("Novo centro de custo")).toBeVisible();
    });

    it("🔴 'Adicionar' nasce desabilitado, e acende com texto", async () => {
      await abrirCentros();
      const botao = screen.getByRole("button", { name: "+ Adicionar" });
      expect(botao).toBeDisabled();

      await userEvent.type(screen.getByLabelText("Novo centro de custo"), "Tributário");
      expect(botao).toBeEnabled();
    });

    it("cria pelo Enter, e o campo se esvazia", async () => {
      await abrirCentros();
      const campo = screen.getByLabelText("Novo centro de custo");
      await userEvent.type(campo, "Tributário{Enter}");

      await waitFor(() =>
        expect(mocks.criarCentroDeCusto).toHaveBeenCalledWith({ nome: "Tributário" }),
      );
      expect(campo).toHaveValue("");
    });

    it("espaço em branco não cria nada", async () => {
      await abrirCentros();
      await userEvent.type(screen.getByLabelText("Novo centro de custo"), "   {Enter}");
      expect(mocks.criarCentroDeCusto).not.toHaveBeenCalled();
    });

    it("renomeia NO LUGAR, clicando no próprio nome", async () => {
      /* Sem lápis: um botão ao lado faria dois gestos para a mesma coisa. */
      await abrirCentros();
      expect(screen.queryByRole("button", { name: "Renomear Cível" })).not.toBeInTheDocument();

      await userEvent.click(screen.getByText("Cível"));
      const campo = await screen.findByLabelText("Novo nome de Cível");
      await userEvent.clear(campo);
      await userEvent.type(campo, "Cível e Consumidor{Enter}");

      await waitFor(() =>
        expect(mocks.atualizarCentroDeCusto).toHaveBeenCalledWith("ce1", {
          nome: "Cível e Consumidor",
        }),
      );
    });

    it("quem não administra não vê o campo de criar nem edita o nome", async () => {
      mocks.papelAtende.mockReturnValue(false);
      await abrirCentros();
      expect(screen.queryByLabelText("Novo centro de custo")).not.toBeInTheDocument();
      await userEvent.click(screen.getByText("Cível"));
      expect(screen.queryByLabelText("Novo nome de Cível")).not.toBeInTheDocument();
    });
  });
});