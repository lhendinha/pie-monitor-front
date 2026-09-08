import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalheFatura: vi.fn(),
  pagarFatura: vi.fn(),
  cancelarFatura: vi.fn(),
  lerCatalogoFinanceiro: vi.fn(),
  detalheCliente: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import FaturaDetalhePage from "./index";

const HOJE = "2026-09-08";

function linha(id: string, descricao: string, centavos: number, extra = {}) {
  return {
    lancamento_id: id, tipo: "honorario", descricao, valor_centavos: centavos,
    data_vencimento: "2026-09-20", situacao: "aberto", natureza: "entrada",
    conta_id: "ct1", categoria_id: "cat1", centro_id: "", rateio: [],
    cliente_id: "c1", contraparte: "", subgrupo_id: "s1", numero_processo: "",
    atendimento_id: "", responsavel: "", documento_numero: "", parcela: "",
    criado_por: "ana@x.com", criado_em: "2026-09-01T10:00:00+00:00", ...extra,
  };
}

const FATURA = {
  fatura_id: "f1", numero: "2026-0007", cliente_id: "c1",
  lancamento_ids: ["l1", "l2"], despesa_ids: ["d1"], reembolso_id: "l2",
  valor_total_centavos: 863_400, data_vencimento: "2026-09-30",
  situacao: "aberta", pago_em: "", criado_por: "ana@x.com",
  criado_em: "2026-09-01T10:00:00+00:00",
  lancamentos: [
    linha("l1", "Honorários da contestação", 800_000),
    linha("l2", "Reembolso de custas", 63_400, { natureza: "saida" }),
  ],
};

const CATALOGO = {
  contas: [
    { conta_id: "ct1", nome: "Itaú — corrente", tipo: "corrente", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
    { conta_id: "ct2", nome: "Caixa do escritório", tipo: "caixa", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
  ],
  categorias: [],
  centros_de_custo: [],
  conta_padrao_id: "ct1",
  cores_disponiveis: [],
};

function Espiao() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{pathname + search}</div>;
}

function montar(rota = "/financeiro/faturas/f1") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/financeiro" element={<div>lista de faturas</div>} />
        <Route path="/financeiro/faturas/:faturaId" element={<FaturaDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";
const carregada = () => screen.findByRole("heading", { name: "Fatura 2026-0007" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(new Date(`${HOJE}T12:00:00`));
  mocks.detalheFatura.mockResolvedValue({ ...FATURA });
  mocks.pagarFatura.mockResolvedValue({ fatura_id: "f1", numero: "2026-0007" });
  mocks.cancelarFatura.mockResolvedValue({ fatura_id: "f1", numero: "2026-0007" });
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
  mocks.detalheCliente.mockResolvedValue({ cliente_id: "c1", nome: "Construtora Alfa" });
  mocks.papelAtende.mockReturnValue(true);
});

describe("hidratação", () => {
  it("🔴 se carrega SOZINHA pelo id da URL -- é rota, tem de aguentar F5", async () => {
    montar();
    await carregada();
    expect(mocks.detalheFatura).toHaveBeenCalledWith("f1");
  });

  it("mostra as linhas cobradas, o total e os dados", async () => {
    montar();
    await carregada();
    expect(screen.getByText("Honorários da contestação")).toBeInTheDocument();
    expect(screen.getByText("R$ 8.000,00")).toBeInTheDocument();
    /* Duas vezes: na etiqueta do título e no total do documento. */
    expect(screen.getAllByText("R$ 8.634,00")).toHaveLength(2);
    expect(screen.getByText("2 lançamentos")).toBeInTheDocument();
    /* ⚠️ `find`, não `get`: o nome vem de UMA SEGUNDA consulta (a fatura
       guarda só o id do cliente), que chega depois do cabeçalho. */
    expect((await screen.findAllByText("Construtora Alfa")).length).toBeGreaterThan(0);
  });

  it("⚠️ a linha de REEMBOLSO se anuncia -- ela não é honorário", async () => {
    montar();
    await carregada();
    expect(screen.getByText("Reembolso de despesa")).toBeInTheDocument();
  });

  it("o cliente que saiu do sistema cai no id, e a tela não fica vazia", async () => {
    mocks.detalheCliente.mockRejectedValue(new Error("404"));
    montar();
    await carregada();
    expect((await screen.findAllByText("c1")).length).toBeGreaterThan(0);
  });

  it("fatura que não existe avisa, e não deixa a tela em branco", async () => {
    mocks.detalheFatura.mockRejectedValue(new Error("404"));
    montar();
    expect(await screen.findByText(/Não foi possível carregar esta fatura/)).toBeInTheDocument();
  });

  it("Voltar leva à sub-aba de Emitidas -- não à outra lista", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    await waitFor(() => expect(url()).toContain("secao=emitidas"));
  });
});

describe("os botões seguem o que o servidor aceitaria", () => {
  it("a fatura ABERTA tem os três", async () => {
    montar();
    await carregada();
    expect(screen.getByRole("button", { name: "Cancelar fatura" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pagamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeInTheDocument();
  });

  it("🔴 a fatura PAGA perde os dois que mexem em dinheiro", async () => {
    /* `_garantir_aberta` responde 409: oferecer o botão seria empurrar para
       o servidor uma pergunta que a tela já sabe responder. */
    mocks.detalheFatura.mockResolvedValue({
      ...FATURA, situacao: "paga", pago_em: "2026-09-25",
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: "Cancelar fatura" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar pagamento" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeInTheDocument();
    expect(screen.getByText(/não há mais o que registrar/)).toBeInTheDocument();
  });

  it("a CANCELADA também, e diz para onde os lançamentos foram", async () => {
    mocks.detalheFatura.mockResolvedValue({ ...FATURA, situacao: "cancelada" });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: "Cancelar fatura" })).not.toBeInTheDocument();
    expect(screen.getByText(/voltaram para 'a faturar'/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imprimir" })).toBeInTheDocument();
  });

  it("🔴 a ATRASADA mantém os dois -- ela continua ABERTA", async () => {
    /* "Atrasada" é derivação da tela sobre a data, não uma quarta situação
       gravada. Ler a etiqueta em vez de `situacao` tiraria os botões de
       toda fatura vencida. */
    mocks.detalheFatura.mockResolvedValue({ ...FATURA, data_vencimento: "2026-08-01" });
    montar();
    await carregada();
    expect(screen.getByText("Atrasada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar fatura" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar pagamento" })).toBeInTheDocument();
  });
});

describe("registrar pagamento", () => {
  async function abrirPagamento() {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
    return screen.findByText(/Registrar pagamento · 2026-0007/);
  }

  it("manda a data de hoje e nenhuma conta, que é o caminho comum", async () => {
    await abrirPagamento();
    const botoes = await screen.findAllByRole("button", { name: /Registrar pagamento/ });
    await userEvent.click(botoes[botoes.length - 1]);
    await waitFor(() =>
      expect(mocks.pagarFatura).toHaveBeenCalledWith("f1", { pago_em: HOJE, conta_id: "" }),
    );
  });

  it("⚠️ a recusa do servidor fica no MODAL, junto do campo de que ela fala", async () => {
    const { ApiError } = await import("../../services/api/client");
    mocks.pagarFatura.mockRejectedValue(new ApiError("Conta desativada: escolha outra", 400));
    await abrirPagamento();
    const botoes = await screen.findAllByRole("button", { name: /Registrar pagamento/ });
    await userEvent.click(botoes[botoes.length - 1]);
    expect(await screen.findByText("Conta desativada: escolha outra")).toBeInTheDocument();
    expect(screen.getByText(/Registrar pagamento · 2026-0007/)).toBeInTheDocument();
  });

  it("o modal diz o valor que a baixa vai mover", async () => {
    await abrirPagamento();
    expect(screen.getAllByText("R$ 8.634,00").length).toBeGreaterThan(0);
  });
});

describe("cancelar", () => {
  it("🔴 avisa que o NÚMERO fica gasto antes de confirmar", async () => {
    /* Cancelar não devolve o número: a próxima fatura sai com o seguinte, e
       a sequência fica com um buraco. Quem cancela precisa saber ANTES. */
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar fatura" }));
    expect(await screen.findByText(/O número 2026-0007 fica gasto/)).toBeInTheDocument();
  });

  it("confirmar cancela e a tela relê", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar fatura" }));
    const botoes = await screen.findAllByRole("button", { name: "Cancelar fatura" });
    await userEvent.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(mocks.cancelarFatura).toHaveBeenCalledWith("f1"));
  });

  it("⚠️ o botão de desistir NÃO se chama 'Cancelar' -- seriam dois nomes iguais", async () => {
    /* A ação se chama "Cancelar fatura"; um "Cancelar" ao lado faria o
       leitor de tela anunciar duas escolhas parecidas no mesmo diálogo. */
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar fatura" }));
    /* ⚠️ "Voltar" existe DUAS vezes com o diálogo aberto: o da página, que
       continua montado, e o do diálogo -- que monta depois. */
    const voltar = await screen.findAllByRole("button", { name: /Voltar/ });
    expect(voltar.length).toBe(2);
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});

describe("o documento no papel", () => {
  it("Imprimir chama a impressão do navegador, e não navega", async () => {
    const imprimir = vi.fn();
    vi.stubGlobal("print", imprimir);
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(imprimir).toHaveBeenCalled();
    expect(url()).toBe("/financeiro/faturas/f1");
    vi.unstubAllGlobals();
  });

  it("🔴 as ações e o Voltar saem do papel, e o documento fica", async () => {
    /* Medido por atributo: a regra `@media print` do tema esconde
       `[data-fora-da-impressao]`, e o jsdom não aplica media query nenhuma
       -- o que dá para afirmar aqui é que a marcação existe. */
    montar();
    await carregada();
    const fora = document.querySelectorAll("[data-fora-da-impressao]");
    expect(fora.length).toBeGreaterThanOrEqual(2);
    expect([...fora].some((e) => e.textContent?.includes("Imprimir"))).toBe(true);
    expect([...fora].some((e) => e.textContent?.includes("Voltar"))).toBe(true);
    /* O par negativo: a tabela do documento NÃO está marcada. */
    expect([...fora].some((e) => e.textContent?.includes("Total da fatura"))).toBe(false);
  });
});
