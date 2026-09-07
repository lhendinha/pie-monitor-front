import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalheLancamento: vi.fn(),
  efetivarLancamento: vi.fn(),
  reabrirLancamento: vi.fn(),
  excluirLancamento: vi.fn(),
  lerCatalogoFinanceiro: vi.fn(),
  /* ⚠️ O catálogo de subgrupos alimenta `useNomeDeSubgrupo`. Sem ele a
     consulta erra em silêncio e o rateio cai para o id -- o teste passaria
     sem exercitar a tradução de verdade. */
  listarSubgrupos: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import LancamentoDetalhePage from "./index";

const LANCAMENTO = {
  lancamento_id: "l1",
  tipo: "honorario",
  descricao: "Honorários Alfa 2/3",
  valor_centavos: 250000,
  data_vencimento: "2026-09-20",
  situacao: "aberto",
  natureza: "entrada",
  conta_id: "ct1",
  categoria_id: "cat1",
  centro_id: "",
  rateio: [{ subgrupo_id: "s1", valor_centavos: 250000 }],
  cliente_id: "c1",
  contraparte: "Construtora Alfa",
  subgrupo_id: "s1",
  numero_processo: "",
  atendimento_id: "",
  responsavel: "ana@x.com",
  documento_numero: "",
  parcela: "2/3",
  criado_por: "ana@x.com",
  criado_em: "2026-09-01T10:00:00+00:00",
};

const CATALOGO = {
  categorias: [{ categoria_id: "cat1", nome: "Honorários contratuais" }],
  contas: [{ conta_id: "ct1", nome: "Itaú — corrente" }],
  centros_de_custo: [{ centro_id: "cc1", nome: "Filial BH" }],
};

function Espiao() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{pathname + search}</div>;
}

function montar(rota = "/financeiro/lancamentos/l1") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/financeiro" element={<div>lista de lançamentos</div>} />
        <Route
          path="/financeiro/lancamentos/:lancamentoId"
          element={<LancamentoDetalhePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

/** A tela pronta -- o título é a descrição do lançamento. */
async function carregada(descricao = LANCAMENTO.descricao) {
  return await screen.findByRole("heading", { name: descricao });
}

/** Abre o diálogo de exclusão e devolve o botão que confirma.
 *
 * ⚠️ O rótulo "Excluir" existe DUAS vezes com o diálogo aberto (o da página
 * e o do rodapé). Pegar o último é o que separa os dois sem depender de
 * ordem de DOM inventada -- o diálogo monta depois. */
async function abrirExclusao() {
  await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
  const botoes = await screen.findAllByRole("button", { name: /Excluir/ });
  return botoes[botoes.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO });
  mocks.efetivarLancamento.mockResolvedValue({ lancamento_id: "l1" });
  mocks.reabrirLancamento.mockResolvedValue({ lancamento_id: "l1" });
  mocks.excluirLancamento.mockResolvedValue({ lancamento_id: "l1", removidos: 1 });
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" },
      { subgrupo_id: "s2", nome: "Trabalhista", grupo_id: "g1" },
    ],
  });
  /* O padrão dos testes é `admin`: eles exercitam o comportamento da tela,
     não a permissão. Quem testa a permissão a declara. */
  mocks.papelAtende.mockReturnValue(true);
});

describe("hidratação", () => {
  it("🔴 se carrega SOZINHA pelo id da URL", async () => {
    /* É o que separa esta tela de um modal: ela é rota, então tem que
       aguentar um F5 e um link colado. */
    montar();
    await carregada();
    expect(mocks.detalheLancamento).toHaveBeenCalledWith("l1");
  });

  it("link velho aponta pra lançamento excluído -- diz isso, e não fica tentando", async () => {
    mocks.detalheLancamento.mockRejectedValue(new Error("não encontrado"));
    montar();
    expect(await screen.findByText(/pode ter sido excluído/)).toBeInTheDocument();
    /* `retry: false`: três tentativas só atrasariam o recado. */
    expect(mocks.detalheLancamento).toHaveBeenCalledTimes(1);
  });

  it("mostra os NOMES de categoria e conta, não os ids", async () => {
    montar();
    await carregada();
    expect(screen.getByText("Honorários contratuais")).toBeInTheDocument();
    expect(screen.getByText("Itaú — corrente")).toBeInTheDocument();
    expect(screen.queryByText("cat1")).not.toBeInTheDocument();
  });

  it("sem centro de custo, o campo NÃO aparece", async () => {
    /* Par negativo do de baixo: campo vazio na tela sugere que alguém
       esqueceu de preencher, e o centro é opcional de propósito. */
    montar();
    await carregada();
    expect(screen.queryByText("Centro de custo")).not.toBeInTheDocument();
  });

  it("com centro de custo, aparece com o nome", async () => {
    mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO, centro_id: "cc1" });
    montar();
    await carregada();
    expect(screen.getByText("Centro de custo")).toBeInTheDocument();
    expect(screen.getByText("Filial BH")).toBeInTheDocument();
  });
});

describe("rateio", () => {
  it("🔴 com UM departamento o rateio não é listado", async () => {
    /* Com um só ele é o próprio lançamento: listá-lo repetiria o valor logo
       abaixo dele mesmo. */
    montar();
    await carregada();
    expect(screen.queryByText("Dividido entre departamentos")).not.toBeInTheDocument();
  });

  it("com DOIS, lista cada um pelo NOME e pelo pedaço", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO,
      rateio: [
        { subgrupo_id: "s1", valor_centavos: 150000 },
        { subgrupo_id: "s2", valor_centavos: 100000 },
      ],
    });
    montar();
    await carregada();
    expect(await screen.findByText("Dividido entre departamentos")).toBeInTheDocument();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
    expect(screen.getByText("Trabalhista")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.500,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.000,00")).toBeInTheDocument();
  });
});

describe("dar baixa", () => {
  it("numa ENTRADA aberta, o botão diz 'recebido'", async () => {
    montar();
    await carregada();
    expect(screen.getByRole("button", { name: "Marcar como recebido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });

  it("numa SAÍDA aberta, diz 'pago'", async () => {
    /* Par negativo do de cima: a mesma data no banco, e a palavra errada
       faria a tela de uma despesa dizer que alguém recebeu. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, natureza: "saida", tipo: "saida",
    });
    montar();
    await carregada();
    expect(screen.getByRole("button", { name: "Marcar como pago" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como recebido" })).not.toBeInTheDocument();
  });

  it("clicar chama o servidor e recarrega o lançamento", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Marcar como recebido" }));
    await waitFor(() => expect(mocks.efetivarLancamento).toHaveBeenCalledWith("l1"));
    /* 🔴 A tela relê: sem isto a situação continuaria "Em aberto" na cara de
       quem acabou de dar a baixa. */
    await waitFor(() => expect(mocks.detalheLancamento).toHaveBeenCalledTimes(2));
  });

  it("o servidor recusa -- a tela continua de pé e avisa", async () => {
    mocks.efetivarLancamento.mockRejectedValue(new Error("já efetivado"));
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Marcar como recebido" }));
    expect(await screen.findByText(/Não foi possível registrar a baixa/)).toBeInTheDocument();
    expect(await carregada()).toBeInTheDocument();
  });

  it("🔴 no EFETIVADO some o 'marcar' e aparece 'desfazer'", async () => {
    /* Um botão que reafirma o que já aconteceu convida ao clique que mexe no
       saldo de novo. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: /Marcar como/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desfazer baixa" })).toBeInTheDocument();
  });

  it("desfazer chama o servidor", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Desfazer baixa" }));
    await waitFor(() => expect(mocks.reabrirLancamento).toHaveBeenCalledWith("l1"));
  });

  it("efetivado numa ENTRADA rotula a data como 'Recebida em'", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.getByText("Recebida em")).toBeInTheDocument();
    expect(screen.queryByText("Paga em")).not.toBeInTheDocument();
  });

  it("efetivado numa SAÍDA rotula como 'Paga em'", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, natureza: "saida", situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.getByText("Paga em")).toBeInTheDocument();
    expect(screen.queryByText("Recebida em")).not.toBeInTheDocument();
  });
});

describe("o que o servidor NÃO aceitaria não vira botão", () => {
  it("🔴 transferência não efetiva nem reabre -- e a tela diz por quê", async () => {
    /* `efetivacao_service`: "Transferência já nasce efetivada" (400) e
       "não reabre: exclua e refaça" (400). Mostrar os botões seria prometer
       o que não se cumpre. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, tipo: "transferencia", natureza: "",
      situacao: "efetivado", data_efetivacao: "2026-09-05", rateio: [],
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: /Marcar como/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer baixa" })).not.toBeInTheDocument();
    expect(screen.getByText(/já nasce efetivada/)).toBeInTheDocument();
  });

  it("🔴 lançamento em FATURA não desfaz baixa nem exclui -- e diz por quê", async () => {
    /* `LancamentoEmFatura`, 409 nas duas: mudariam o total de um documento
       que o cliente já recebeu. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05", fatura_id: "f1",
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: "Desfazer baixa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(screen.getByText(/cancele a fatura antes/)).toBeInTheDocument();
  });

  it("sem impedimento, nenhum recado aparece", async () => {
    /* Par negativo dos dois de cima: o subtítulo explica a ausência de um
       botão, e um subtítulo que aparece sempre não explicaria nada. */
    montar();
    await carregada();
    expect(screen.queryByText(/cancele a fatura antes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/já nasce efetivada/)).not.toBeInTheDocument();
  });

  it("🔴 quem não é admin não vê 'Excluir'", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    /* E continua podendo dar baixa: a régua é só da exclusão. */
    expect(screen.getByRole("button", { name: "Marcar como recebido" })).toBeInTheDocument();
  });
});

describe("excluir", () => {
  it("pede confirmação antes, e cancelar não chama nada", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/será removido/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(screen.queryByText(/será removido/)).not.toBeInTheDocument(),
    );
    expect(mocks.excluirLancamento).not.toHaveBeenCalled();
  });

  it("confirmar exclui com escopo 'este' e volta pra lista", async () => {
    montar();
    await carregada();
    await userEvent.click(await abrirExclusao());
    await waitFor(() => expect(mocks.excluirLancamento).toHaveBeenCalledWith("l1", "este"));
    await waitFor(() => expect(url()).toBe("/financeiro?aba=lancamentos"));
  });

  it("🔴 a exclusão FALHA -- a tela não navega e o recado aparece", async () => {
    mocks.excluirLancamento.mockRejectedValue(new Error("está numa fatura"));
    montar();
    await carregada();
    await userEvent.click(await abrirExclusao());
    expect(await screen.findByText(/Não foi possível excluir/)).toBeInTheDocument();
    expect(url()).toBe("/financeiro/lancamentos/l1");
  });

  it("🔴 num EFETIVADO, o aviso fala do SALDO", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/volta para o saldo da conta/)).toBeInTheDocument();
  });

  it("num aberto, o aviso do saldo não aparece", async () => {
    /* Par negativo: nada volta para saldo nenhum -- o dinheiro nunca entrou. */
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/será removido/)).toBeInTheDocument();
    expect(screen.queryByText(/volta para o saldo da conta/)).not.toBeInTheDocument();
  });
});

describe("a série", () => {
  const NA_SERIE = { ...LANCAMENTO, recorrencia_id: "r1" };

  it("🔴 sem série, a escolha de alcance NÃO é oferecida", async () => {
    /* Sem irmãos o servidor ignora o escopo: perguntar pediria uma decisão
       que não muda nada. */
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/será removido/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Somente este" })).not.toBeInTheDocument();
  });

  it("com série, oferece as duas opções", async () => {
    mocks.detalheLancamento.mockResolvedValue(NA_SERIE);
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByRole("button", { name: "Somente este" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Este e os próximos em aberto" }),
    ).toBeInTheDocument();
  });

  it("🔴 escolher 'os próximos' manda escopo=futuros", async () => {
    mocks.detalheLancamento.mockResolvedValue(NA_SERIE);
    mocks.excluirLancamento.mockResolvedValue({ lancamento_id: "l1", removidos: 3 });
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Este e os próximos em aberto" }),
    );
    const botoes = screen.getAllByRole("button", { name: /Excluir/ });
    await userEvent.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(mocks.excluirLancamento).toHaveBeenCalledWith("l1", "futuros"));
  });

  it("🔴 reabrir o diálogo volta pro padrão 'somente este'", async () => {
    /* A escolha da vez passada não pode virar padrão silencioso: quem
       cancelou e clicou de novo apagaria a série inteira sem ter pedido. */
    mocks.detalheLancamento.mockResolvedValue(NA_SERIE);
    montar();
    await carregada();

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Este e os próximos em aberto" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    const botoes = await screen.findAllByRole("button", { name: /Excluir/ });
    await userEvent.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(mocks.excluirLancamento).toHaveBeenCalledWith("l1", "este"));
  });
});

describe("voltar", () => {
  it("o botão volta para a lista de lançamentos", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    await waitFor(() => expect(url()).toContain("/financeiro"));
  });
});
