import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  lerFluxoDeCaixa: vi.fn(),
  lerCatalogoFinanceiro: vi.fn(),
  papelAtende: vi.fn(() => true),
}));
vi.mock("../../../../services", () => mocks);

import FluxoDeCaixa from "./index";
import { montarPlanilhaDoFluxo, nomeDoArquivoDoFluxo } from "./planilhaDoFluxo";

const HOJE = "2026-09-08";
const MESES = ["2026-07", "2026-08", "2026-09"];

const porMes = (a: number, b: number, c: number) => ({
  "2026-07": a, "2026-08": b, "2026-09": c,
});

const FLUXO = {
  meses: MESES,
  saldo_disponivel: true,
  linhas: [
    {
      categoria_id: "cat1", nome: "Honorários", natureza: "entrada", cor: "#1f9d55",
      por_mes: porMes(1_000_00, 2_000_00, 0), total_centavos: 3_000_00,
    },
    {
      categoria_id: "cat2", nome: "Impostos", natureza: "saida", cor: "#d64550",
      por_mes: porMes(100_00, 100_00, 100_00), total_centavos: 300_00,
    },
    {
      categoria_id: "cat3", nome: "Aluguel", natureza: "saida", cor: "#c97a00",
      por_mes: porMes(500_00, 500_00, 500_00), total_centavos: 1_500_00,
    },
  ],
  entradas_por_mes: porMes(1_000_00, 2_000_00, 0),
  saidas_por_mes: porMes(600_00, 600_00, 600_00),
  entradas_realizadas_por_mes: porMes(1_000_00, 1_500_00, 0),
  saidas_realizadas_por_mes: porMes(600_00, 600_00, 0),
  entradas_previstas_por_mes: porMes(0, 500_00, 0),
  saidas_previstas_por_mes: porMes(0, 0, 600_00),
  transferencias_por_mes: porMes(0, 0, 0),
  aberturas_de_conta_por_mes: porMes(0, 0, 0),
  saldo_anterior_por_mes: porMes(0, 400_00, 1_300_00),
  saldo_do_periodo_por_mes: porMes(400_00, 900_00, -600_00),
  saldo_final_por_mes: porMes(400_00, 1_300_00, 700_00),
};

const CATALOGO = {
  contas: [
    { conta_id: "ct1", nome: "Itaú — corrente", tipo: "corrente", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
  ],
  categorias: [],
  centros_de_custo: [{ centro_id: "cc1", nome: "Filial BH", ativo: true }],
  conta_padrao_id: "ct1",
  cores_disponiveis: [],
};

function Espiao() {
  const { search } = useLocation();
  return <div data-testid="url">{search}</div>;
}

function montar(rota = "/financeiro?aba=fluxo") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/financeiro" element={<FluxoDeCaixa />} />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";
const carregada = () => screen.findByText("Honorários");
const painelDoPeriodo = () =>
  within(document.querySelector<HTMLElement>('[data-scope="popover"][data-part="content"]')!);

/** ⚠️ Pela PÍLULA (o gatilho do popover), e não por texto: "Este ano" é o
 * rótulo dela E uma opção de dentro do painel, e `getByText` acharia dois. */
async function abrirPeriodo() {
  await userEvent.click(
    document.querySelector<HTMLElement>('[data-scope="popover"][data-part="trigger"]')!,
  );
  await screen.findByRole("dialog");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date(`${HOJE}T12:00:00`));
  mocks.lerFluxoDeCaixa.mockResolvedValue(FLUXO);
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
});

describe("a tabela", () => {
  it("abre em 'Este ano' e pede o ano inteiro EM MESES", async () => {
    montar();
    await carregada();
    expect(mocks.lerFluxoDeCaixa).toHaveBeenCalledWith(
      expect.objectContaining({ de: "2026-01", ate: "2026-12" }),
    );
  });

  it("uma coluna por mês, com o cabeçalho abreviado", async () => {
    montar();
    await carregada();
    for (const rotulo of ["jul/2026", "ago/2026", "set/2026"]) {
      expect(screen.getByText(rotulo)).toBeInTheDocument();
    }
  });

  it("🔴 realça o mês CORRENTE, e só ele -- a coluna INTEIRA", async () => {
    /* ⚠️ Pelo marcador, não pela cor: a cor vira classe do Chakra e o jsdom
       devolve transparente nos dois casos. Ela se mede em Chrome.

       ⚠️ E a coluna inteira, não só o cabeçalho: pintar só o topo perde o
       realce assim que a pessoa rola numa tabela de vinte categorias. */
    montar();
    await carregada();
    const marcadas = document.querySelectorAll("[data-mes-corrente]");
    const linhas = document.querySelectorAll("tbody tr").length;
    expect(marcadas.length).toBe(linhas + 1);
    expect(screen.getByText("set/2026").closest("[data-mes-corrente]")).not.toBeNull();
    expect(screen.getByText("jul/2026").closest("[data-mes-corrente]")).toBeNull();
  });

  it("as três linhas de saldo aparecem", async () => {
    montar();
    await carregada();
    for (const rotulo of ["Saldo anterior", "Saldo do período", "Saldo final"]) {
      expect(screen.getByText(rotulo)).toBeInTheDocument();
    }
  });

  it("⚠️ o realizado aparece embaixo do previsto quando eles DIFEREM", async () => {
    /* A resposta separa os dois de propósito: num mês passado o previsto que
       não aconteceu está na coluna e não está no saldo. */
    montar();
    await carregada();
    expect(screen.getByText("R$ 1.500,00 realizado")).toBeInTheDocument();
  });

  it("período sem lançamento diz isso, em vez de tabela vazia", async () => {
    mocks.lerFluxoDeCaixa.mockResolvedValue({ ...FLUXO, linhas: [] });
    montar();
    expect(await screen.findByText("Nenhum lançamento neste período.")).toBeInTheDocument();
  });
});

describe("dobrar as seções", () => {
  it("🔴 dobrar esconde as CATEGORIAS e mantém o TOTAL da seção", async () => {
    /* O total é por onde se lê o mês: escondê-lo junto transformaria a
       tabela dobrada numa tabela vazia. */
    montar();
    await carregada();
    expect(screen.getByText("Impostos")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Saídas/ }));

    expect(screen.queryByText("Impostos")).not.toBeInTheDocument();
    expect(screen.queryByText("Aluguel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Saídas/ })).toBeInTheDocument();
    /* O total da seção de saídas continua: 600 + 600 + 600. */
    expect(screen.getByText("R$ 1.800,00")).toBeInTheDocument();
  });

  it("⚠️ dobrar uma seção NÃO dobra a outra", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: /Saídas/ }));
    expect(screen.getByText("Honorários")).toBeInTheDocument();
  });

  it("dobrar e desdobrar traz as categorias de volta", async () => {
    montar();
    await carregada();
    const saidas = screen.getByRole("button", { name: /Saídas/ });
    await userEvent.click(saidas);
    await userEvent.click(saidas);
    expect(screen.getByText("Impostos")).toBeInTheDocument();
  });

  it("a seção anuncia se está aberta -- `aria-expanded`", async () => {
    montar();
    await carregada();
    const saidas = screen.getByRole("button", { name: /Saídas/ });
    expect(saidas).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(saidas);
    expect(screen.getByRole("button", { name: /Saídas/ }))
      .toHaveAttribute("aria-expanded", "false");
  });
});

describe("o período", () => {
  it("escolher outro pede o novo recorte e vai para a URL", async () => {
    montar();
    await carregada();
    await abrirPeriodo();
    await userEvent.click(painelDoPeriodo().getByRole("button", { name: "Últimos 6 meses" }));
    await waitFor(() =>
      expect(mocks.lerFluxoDeCaixa).toHaveBeenCalledWith(
        expect.objectContaining({ de: "2026-04", ate: "2026-09" }),
      ),
    );
    expect(url()).toContain("periodo=ult6meses");
  });

  it("🔴 as opções são de MÊS -- nada de 'Hoje' nem 'Últimos 7 dias'", async () => {
    /* Uma coluna só não responde a pergunta que um fluxo de caixa existe
       para responder. */
    montar();
    await carregada();
    await abrirPeriodo();
    const painel = painelDoPeriodo();
    expect(painel.queryByRole("button", { name: "Hoje" })).not.toBeInTheDocument();
    expect(painel.queryByRole("button", { name: "Últimos 7 dias" })).not.toBeInTheDocument();
    expect(painel.getByRole("button", { name: "Próximos 12 meses" })).toBeInTheDocument();
  });

  it("um endereço com período abre nele", async () => {
    montar("/financeiro?aba=fluxo&periodo=anopassado");
    await carregada();
    expect(mocks.lerFluxoDeCaixa).toHaveBeenCalledWith(
      expect.objectContaining({ de: "2025-01", ate: "2025-12" }),
    );
  });

  it("🔴 período inválido na URL avisa e NÃO vira requisição", async () => {
    /* As duas regras são as do servidor: ir buscar um 400 para descobrir o
       que a tela já sabe vira "Não foi possível carregar". */
    montar("/financeiro?aba=fluxo&periodo=personalizado&de=2024-01&ate=2027-01");
    expect(await screen.findByText(/O período tem 37 meses/)).toBeInTheDocument();
    expect(mocks.lerFluxoDeCaixa).not.toHaveBeenCalled();
  });

  it("e o invertido também", async () => {
    montar("/financeiro?aba=fluxo&periodo=personalizado&de=2026-12&ate=2026-01");
    expect(await screen.findByText("O mês final vem antes do inicial.")).toBeInTheDocument();
    expect(mocks.lerFluxoDeCaixa).not.toHaveBeenCalled();
  });
});

describe("os filtros", () => {
  it("a conta escolhida entra no pedido e na URL", async () => {
    montar("/financeiro?aba=fluxo&conta=ct1");
    await carregada();
    expect(mocks.lerFluxoDeCaixa).toHaveBeenCalledWith(
      expect.objectContaining({ conta_id: "ct1" }),
    );
  });

  it("🔴 com centro filtrado, o SALDO some e a tela explica", async () => {
    /* O saldo é da CONTA: mostrar zero seria inventar um número que não
       existe em extrato nenhum. */
    mocks.lerFluxoDeCaixa.mockResolvedValue({ ...FLUXO, saldo_disponivel: false });
    montar("/financeiro?aba=fluxo&centro=cc1");
    await carregada();
    expect(screen.queryByText("Saldo final")).not.toBeInTheDocument();
    expect(screen.getByText(/O saldo é da CONTA/)).toBeInTheDocument();
  });
});

describe("exportar planilha", () => {
  it("🔴 o CSV tem uma coluna por mês, mais categoria e total", async () => {
    const csv = montarPlanilhaDoFluxo(FLUXO);
    const cabecalho = csv.split("\r\n")[0].replace("﻿", "").split(";");
    expect(cabecalho).toEqual(["Categoria", "jul/2026", "ago/2026", "set/2026", "Total"]);
    expect(cabecalho).toHaveLength(FLUXO.meses.length + 2);
  });

  it("🔴 e as SOMAS da tela -- seções, categorias e saldos", async () => {
    const csv = montarPlanilhaDoFluxo(FLUXO);
    expect(csv).toContain("ENTRADAS;1000,00;2000,00;0,00;3000,00");
    expect(csv).toContain("Honorários;1000,00;2000,00;0,00;3000,00");
    expect(csv).toContain("SAÍDAS;600,00;600,00;600,00;1800,00");
    expect(csv).toContain("Saldo final;400,00;1300,00;700,00;");
  });

  it("⚠️ sem saldo disponível, a planilha não inventa as três linhas", async () => {
    const csv = montarPlanilhaDoFluxo({ ...FLUXO, saldo_disponivel: false });
    expect(csv).not.toContain("Saldo final");
  });

  it("o nome do arquivo leva o PERÍODO", () => {
    expect(nomeDoArquivoDoFluxo(MESES)).toBe("fluxo-de-caixa-2026-07-a-2026-09.csv");
    expect(nomeDoArquivoDoFluxo([])).toBe("fluxo-de-caixa.csv");
  });

  it("o botão baixa o arquivo", async () => {
    const criar = vi.fn(() => "blob:x");
    vi.stubGlobal("URL", { ...URL, createObjectURL: criar, revokeObjectURL: vi.fn() });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Exportar planilha" }));
    expect(clique).toHaveBeenCalled();
    clique.mockRestore();
    vi.unstubAllGlobals();
  });

  it("⚠️ sem linha nenhuma o botão fica desabilitado -- planilha vazia não serve", async () => {
    mocks.lerFluxoDeCaixa.mockResolvedValue({ ...FLUXO, linhas: [] });
    montar();
    await screen.findByText("Nenhum lançamento neste período.");
    expect(screen.getByRole("button", { name: "Exportar planilha" })).toBeDisabled();
  });
});
