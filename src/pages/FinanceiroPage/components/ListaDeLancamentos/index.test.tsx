import { MemoryRouter } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listarLancamentos: vi.fn(),
  lerCatalogoFinanceiro: vi.fn(),
  papelAtende: vi.fn(() => true),
  listarSubgrupos: vi.fn(),
}));
vi.mock("../../../../services", () => mocks);

import { renderComProviders } from "../../../../test/queryTestUtils";
import ListaDeLancamentos from ".";

const CATALOGO = {
  contas: [{ conta_id: "c1", nome: "Itaú", tipo: "corrente", inicio: "2026-01-01",
             saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true }],
  categorias: [{ categoria_id: "cat1", nome: "Honorários", natureza: "entrada",
                 cor: "#1f9d55", agrupador_id: "", ativa: true }],
  centros_de_custo: [],
  conta_padrao_id: "c1",
  cores_disponiveis: ["#1f9d55"],
};

const RATEADO = {
  lancamento_id: "l1", tipo: "honorario", descricao: "Honorários da contestação",
  valor_centavos: 1_000_000, data_vencimento: "2026-09-20", situacao: "aberto",
  natureza: "entrada", conta_id: "c1", categoria_id: "cat1", centro_id: "",
  rateio: [{ subgrupo_id: "civel", valor_centavos: 600_000 },
           { subgrupo_id: "trab", valor_centavos: 400_000 }],
  cliente_id: "", contraparte: "Construtora Alfa", subgrupo_id: "", numero_processo: "",
  atendimento_id: "", responsavel: "", documento_numero: "", parcela: "",
  criado_por: "x@y.com", criado_em: "2026-09-01T00:00:00Z",
};

function resposta(lancamentos: unknown[], extras: Record<string, unknown> = {}) {
  return {
    lancamentos, pagina: 1, tamanho_pagina: 10,
    total: lancamentos.length, total_paginas: 1,
    totais: {
      a_receber_centavos: 1_000_000, a_receber_quantidade: 1,
      a_pagar_centavos: 0, a_pagar_quantidade: 0,
      atrasado_centavos: 0, atrasado_quantidade: 0,
    },
    ...extras,
  };
}

function montar(rota = "/financeiro?aba=lancamentos") {
  renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <ListaDeLancamentos />
    </MemoryRouter>,
  );
}

/** Os parâmetros da última consulta -- é o que prova o que a tela PEDIU. */
function pedido() {
  const chamadas = mocks.listarLancamentos.mock.calls;
  return chamadas[chamadas.length - 1][0] as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
  mocks.listarLancamentos.mockResolvedValue(resposta([RATEADO]));
});

describe("ListaDeLancamentos", () => {
  it("🔴 abre em 'Este mês' e PEDE o período -- não o ano inteiro", async () => {
    /* No primeiro carregamento ninguém escolheu nada, e `de`/`ate` não estão
       na URL. Sem derivar do período padrão, a consulta iria sem as duas
       pontas e a tela mostraria o ano com a pílula dizendo "Este mês". */
    montar();
    await waitFor(() => expect(mocks.listarLancamentos).toHaveBeenCalled());
    expect(pedido().de).toBeTruthy();
    expect(pedido().ate).toBeTruthy();
  });

  it("os nomes da categoria e da conta vêm do catálogo", async () => {
    montar();
    expect(await screen.findByText("Honorários")).toBeInTheDocument();
    expect(screen.getByText("Itaú")).toBeInTheDocument();
  });

  it("🔴 os cards vêm da RESPOSTA, não da soma das linhas", async () => {
    /* A resposta diz R$ 10.000 a receber com UMA linha na página. Somar as
       linhas daria o mesmo aqui por acaso -- o que prova a régua é o card
       continuar certo quando a resposta discorda da página. */
    mocks.listarLancamentos.mockResolvedValue(
      resposta([RATEADO], {
        totais: {
          a_receber_centavos: 4_500_000, a_receber_quantidade: 7,
          a_pagar_centavos: 0, a_pagar_quantidade: 0,
          atrasado_centavos: 0, atrasado_quantidade: 0,
        },
      }),
    );
    montar();
    expect(await screen.findByText("R$ 45.000,00")).toBeInTheDocument();
    expect(screen.getByText("7 lançamentos")).toBeInTheDocument();
  });

  it("o card diz de que período ele fala", async () => {
    montar();
    expect(await screen.findByText(/A receber · este mês/)).toBeInTheDocument();
  });

  it("⚠️ sem filtro de departamento, a linha mostra o valor inteiro", async () => {
    montar();
    expect(await screen.findByText("+ R$ 10.000,00")).toBeInTheDocument();
    expect(screen.queryByText(/^de R\$/)).not.toBeInTheDocument();
  });

  it("🔴 com filtro, mostra o PEDAÇO e o total entre parênteses", async () => {
    mocks.listarLancamentos.mockResolvedValue(
      resposta([{ ...RATEADO, valor_no_departamento_centavos: 400_000 }]),
    );
    montar("/financeiro?aba=lancamentos&departamento=trab");
    expect(await screen.findByText("+ R$ 4.000,00")).toBeInTheDocument();
    expect(screen.getByText("de R$ 10.000,00")).toBeInTheDocument();
  });

  it("o departamento escolhido vai na consulta", async () => {
    montar("/financeiro?aba=lancamentos&departamento=trab");
    await waitFor(() => expect(pedido().subgrupo_id).toBe("trab"));
  });

  it("🔴 clicar num card filtra por NATUREZA, e não por tipo", async () => {
    /* "A receber" soma honorário E entrada. Filtrando por `tipo=entrada`, o
       card de R$ 7.300,00 em 3 lançamentos abria uma lista de R$ 3.200,00 em
       1 -- medido na base local. O número clicado sumia no clique. */
    const user = userEvent.setup();
    montar();
    await screen.findByText(/A receber · este mês/);
    await user.click(screen.getByRole("button", { name: /A receber/ }));
    await waitFor(() => expect(pedido().situacao).toBe("aberto"));
    expect(pedido().natureza).toBe("entrada");
    expect(pedido().tipo).toBeUndefined();
  });

  it("🔴 e ZERA o tipo que estava escolhido na pílula", async () => {
    /* Par negativo do de cima: `tipo=saida` da pílula cruzado com "tudo que
       entra" devolveria lista vazia -- dois filtros que se anulam, sem nada
       na tela dizendo isso. */
    const user = userEvent.setup();
    montar("/financeiro?aba=lancamentos&tipo=saida");
    await screen.findByText(/A receber · este mês/);
    await user.click(screen.getByRole("button", { name: /A receber/ }));
    await waitFor(() => expect(pedido().natureza).toBe("entrada"));
    expect(pedido().tipo).toBeUndefined();
  });

  it("o card de atrasados não escolhe lado nenhum", async () => {
    /* "O que já devia ter acontecido e não aconteceu" são os dois lados. */
    const user = userEvent.setup();
    montar();
    await screen.findByText(/Atrasado · este mês/);
    await user.click(screen.getByRole("button", { name: /Atrasado/ }));
    await waitFor(() => expect(pedido().situacao).toBe("atrasado"));
    expect(pedido().natureza).toBeUndefined();
  });

  it("lista vazia diz que não há nada no período", async () => {
    mocks.listarLancamentos.mockResolvedValue(resposta([]));
    montar();
    expect(await screen.findByText("Nenhum lançamento neste período.")).toBeInTheDocument();
  });

  it("⚠️ a falha avisa e oferece tentar de novo, em vez de tela em branco", async () => {
    mocks.listarLancamentos.mockRejectedValue(new Error("caiu"));
    montar();
    expect(await screen.findByText(/Não foi possível carregar os lançamentos/)).toBeInTheDocument();
  });
});
