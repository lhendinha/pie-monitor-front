import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listarAFaturar: vi.fn(),
  listarFaturas: vi.fn(),
  listarClientes: vi.fn(),
  emitirFatura: vi.fn(),
  papelAtende: vi.fn(() => true),
}));
vi.mock("../../../../services", () => mocks);

import { renderComProviders } from "../../../../test/queryTestUtils";
import ListaDeFaturas from ".";

const HOJE = "2026-09-08";

const A_FATURAR = {
  clientes: [
    {
      cliente_id: "cli1", cliente_nome: "Construtora Alfa",
      honorarios_centavos: 1_200_000, despesas_centavos: 48_000,
      total_centavos: 1_248_000,
      lancamentos: [
        {
          lancamento_id: "l1", tipo: "honorario", descricao: "Honorários da contestação",
          valor_centavos: 1_200_000, data_vencimento: "2026-09-20", situacao: "aberto",
          natureza: "entrada", conta_id: "c1", categoria_id: "cat1", centro_id: "",
          rateio: [], cliente_id: "cli1", contraparte: "", subgrupo_id: "",
          numero_processo: "", atendimento_id: "", responsavel: "", documento_numero: "",
          parcela: "", criado_por: "x", criado_em: "2026-09-01T00:00:00Z",
        },
      ],
    },
  ],
  total_centavos: 1_248_000,
};

const FATURAS = {
  faturas: [
    {
      fatura_id: "f1", numero: "2026-0007", cliente_id: "cli1",
      lancamento_ids: ["l1"], despesa_ids: [], reembolso_id: "",
      valor_total_centavos: 800_000, data_vencimento: "2026-09-30",
      situacao: "aberta", pago_em: "", criado_por: "x", criado_em: "2026-09-01T00:00:00Z",
    },
    {
      fatura_id: "f2", numero: "2026-0006", cliente_id: "cli1",
      lancamento_ids: ["l2"], despesa_ids: [], reembolso_id: "",
      valor_total_centavos: 180_000, data_vencimento: "2026-08-31",
      situacao: "aberta", pago_em: "", criado_por: "x", criado_em: "2026-08-01T00:00:00Z",
    },
    {
      fatura_id: "f3", numero: "2026-0005", cliente_id: "cli1",
      lancamento_ids: ["l3"], despesa_ids: [], reembolso_id: "",
      valor_total_centavos: 320_000, data_vencimento: "2026-08-20",
      situacao: "paga", pago_em: "2026-08-18", criado_por: "x", criado_em: "2026-08-01T00:00:00Z",
    },
  ],
  total: 3,
  total_paginas: 1,
};

/** A mesma página de três, mas dizendo que há 42 no total -- é o que faz a
 * barra de paginação aparecer sem inventar 42 objetos. */
const FATURAS_COM_QUATRO_PAGINAS = { ...FATURAS, total: 42, total_paginas: 5 };

function Espiao() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{pathname + search}</div>;
}

function montar(rota = "/financeiro?aba=faturas") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/financeiro" element={<ListaDeFaturas />} />
        <Route path="/financeiro/faturas/:id" element={<div>documento da fatura</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date(`${HOJE}T12:00:00`));
  mocks.listarAFaturar.mockResolvedValue(A_FATURAR);
  mocks.listarFaturas.mockResolvedValue(FATURAS);
  mocks.listarClientes.mockResolvedValue({
    clientes: [{ cliente_id: "cli1", nome: "Construtora Alfa" }],
  });
});

describe("as duas seções", () => {
  it("abre em 'A faturar' -- é a que pede ação", async () => {
    montar();
    expect(await screen.findByText("Construtora Alfa")).toBeInTheDocument();
    expect(screen.getByText(/clique no cliente para emitir/)).toBeInTheDocument();
  });

  it("🔴 honorários e despesas em colunas SEPARADAS", async () => {
    /* A fatura os trata diferente: o honorário é linha de cobrança, a
       despesa vira reembolso. Somá-los numa coluna esconderia isso. */
    montar();
    expect(await screen.findByText("R$ 12.000,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 480,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 12.480,00")).toBeInTheDocument();
  });

  it("🔴 a pílula de período NÃO aparece em 'A faturar'", async () => {
    /* Aquilo é "o que está aberto HOJE", não um recorte de tempo -- uma
       pílula que não filtra nada engana. */
    montar();
    await screen.findByText("Construtora Alfa");
    expect(screen.queryByText("Todos os períodos")).not.toBeInTheDocument();
  });

  it("e aparece em 'Emitidas' -- o par negativo", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Emitidas" }));
    expect(await screen.findByText("Todos os períodos")).toBeInTheDocument();
  });

  it("a seção escolhida vai para a URL", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Emitidas" }));
    await waitFor(() => expect(url()).toContain("secao=emitidas"));
  });

  it("⚠️ cada seção carrega a SUA consulta, não as duas", async () => {
    montar();
    await screen.findByText("Construtora Alfa");
    expect(mocks.listarAFaturar).toHaveBeenCalled();
    expect(mocks.listarFaturas).not.toHaveBeenCalled();
  });
});

describe("as faturas emitidas", () => {
  it("mostra número, cliente e valor", async () => {
    montar("/financeiro?aba=faturas&secao=emitidas");
    expect(await screen.findByText("2026-0007")).toBeInTheDocument();
    expect(screen.getAllByText("Construtora Alfa").length).toBeGreaterThan(0);
    expect(screen.getByText("R$ 8.000,00")).toBeInTheDocument();
  });

  it("🔴 a vencida vira ATRASADA na tela, embora o servidor a chame de aberta", async () => {
    /* Atraso é a data lida contra hoje. Mantê-lo no banco exigiria
       reescrever toda fatura aberta todas as noites. */
    montar("/financeiro?aba=faturas&secao=emitidas");
    await screen.findByText("2026-0006");
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByText("Paga")).toBeInTheDocument();
  });

  it("⚠️ a não paga mostra TRAVESSÃO na coluna de pagamento", async () => {
    /* Vazio lê-se como "não carregou"; o travessão diz "não aconteceu". */
    montar("/financeiro?aba=faturas&secao=emitidas");
    await screen.findByText("2026-0007");
    expect(screen.getAllByText("—").length).toBe(2);
    expect(screen.getByText("18/08/2026")).toBeInTheDocument();
  });

  it("clicar na linha abre o documento", async () => {
    montar("/financeiro?aba=faturas&secao=emitidas");
    await userEvent.click(await screen.findByText("2026-0007"));
    await waitFor(() => expect(url()).toBe("/financeiro/faturas/f1"));
  });

  it("sem fatura no período, diz isso", async () => {
    mocks.listarFaturas.mockResolvedValue({ faturas: [], total: 0, total_paginas: 0 });
    montar("/financeiro?aba=faturas&secao=emitidas");
    expect(await screen.findByText("Nenhuma fatura emitida neste período.")).toBeInTheDocument();
  });
});

describe("a paginação de Emitidas", () => {
  /** 🔴 A lista SÓ CRESCE: fatura paga e fatura cancelada continuam nela.
   * É o que separa esta seção de "A faturar", que encolhe conforme se
   * cobra -- e é por isso que só esta é paginada. */

  it("⚠️ com três faturas a barra não aparece -- não há o que paginar", async () => {
    montar("/financeiro?aba=faturas&secao=emitidas");
    await screen.findByText("2026-0007");
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("com mais que uma página, a barra aparece e a contagem é a do TOTAL", async () => {
    mocks.listarFaturas.mockResolvedValue(FATURAS_COM_QUATRO_PAGINAS);
    montar("/financeiro?aba=faturas&secao=emitidas");
    expect(await screen.findByText("Mostrando 3 de 42 faturas emitidas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  });

  it("clicar na página 2 pede a página 2 ao servidor e a põe na URL", async () => {
    mocks.listarFaturas.mockResolvedValue(FATURAS_COM_QUATRO_PAGINAS);
    montar("/financeiro?aba=faturas&secao=emitidas");
    await userEvent.click(await screen.findByRole("button", { name: "2" }));
    await waitFor(() =>
      expect(mocks.listarFaturas).toHaveBeenCalledWith(expect.objectContaining({ pagina: 2 })),
    );
    expect(url()).toContain("pagina=2");
  });

  it("🔴 trocar o PERÍODO apaga a página", async () => {
    /* A 4ª página de "todos os períodos" quase nunca existe em "este mês":
       sem esta limpeza, escolher o período mostraria uma lista vazia sem
       nada na tela explicando por quê. */
    mocks.listarFaturas.mockResolvedValue(FATURAS_COM_QUATRO_PAGINAS);
    montar("/financeiro?aba=faturas&secao=emitidas&pagina=3");
    await waitFor(() =>
      expect(mocks.listarFaturas).toHaveBeenCalledWith(expect.objectContaining({ pagina: 3 })),
    );
    mocks.listarFaturas.mockClear();

    await userEvent.click(
      document.querySelector<HTMLElement>('[data-scope="popover"][data-part="trigger"]')!,
    );
    const painel = within(
      await waitFor(() =>
        document.querySelector<HTMLElement>('[data-scope="popover"][data-part="content"]')!,
      ),
    );
    await userEvent.click(painel.getByRole("button", { name: "Este mês" }));

    await waitFor(() => expect(mocks.listarFaturas).toHaveBeenCalled());
    expect(mocks.listarFaturas).not.toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 3 }),
    );
    expect(url()).not.toContain("pagina=3");
  });

  it("⚠️ um endereço com período e página abre direto neles", async () => {
    mocks.listarFaturas.mockResolvedValue(FATURAS_COM_QUATRO_PAGINAS);
    montar("/financeiro?aba=faturas&secao=emitidas&pagina=2&tamanho=20");
    await waitFor(() =>
      expect(mocks.listarFaturas).toHaveBeenCalledWith(
        expect.objectContaining({ pagina: 2, tamanhoPagina: 20 }),
      ),
    );
  });

  it("a seção 'A faturar' NÃO pagina -- o par negativo", async () => {
    montar("/financeiro?aba=faturas&pagina=2");
    await screen.findByText("Construtora Alfa");
    expect(mocks.listarAFaturar).toHaveBeenCalledWith();
    expect(screen.queryByText(/Por página/)).not.toBeInTheDocument();
  });
});

describe("emitir", () => {
  it("clicar no cliente abre a emissão dele", async () => {
    montar();
    await userEvent.click(await screen.findByText("Construtora Alfa"));
    expect(await screen.findByText(/Emitir fatura · Construtora Alfa/)).toBeInTheDocument();
  });

  it("nada a faturar diz isso, em vez de tabela vazia", async () => {
    mocks.listarAFaturar.mockResolvedValue({ clientes: [], total_centavos: 0 });
    montar();
    expect(await screen.findByText(/Nada a faturar/)).toBeInTheDocument();
  });
});
