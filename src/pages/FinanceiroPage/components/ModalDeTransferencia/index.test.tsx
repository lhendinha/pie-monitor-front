import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listarMembrosDoGrupo: vi.fn(),
  getEmail: vi.fn(),
  papelAtende: vi.fn(() => true),
}));
vi.mock("../../../../services", () => mocks);

import { renderComProviders } from "../../../../test/queryTestUtils";
import ModalDeTransferencia from ".";

const CATALOGO = {
  contas: [
    { conta_id: "c1", nome: "Itaú", tipo: "corrente", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
    { conta_id: "c2", nome: "Caixa do escritório", tipo: "outros", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
  ],
  categorias: [],
  centros_de_custo: [],
  conta_padrao_id: "c1",
  cores_disponiveis: [],
};

const onSalvar = vi.fn();
const onFechar = vi.fn();

function montar(erro?: string) {
  return renderComProviders(
    <ModalDeTransferencia
      catalogo={CATALOGO}
      erro={erro}
      onSalvar={onSalvar}
      onFechar={onFechar}
    />,
  );
}

async function escolher(rotulo: RegExp, opcao: string) {
  await userEvent.click(screen.getByLabelText(rotulo));
  await userEvent.click(await screen.findByRole("option", { name: opcao }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [] });
  mocks.getEmail.mockReturnValue("ana@x.com");
});

describe("o que ela NÃO tem", () => {
  it("🔴 nem situação, nem categoria, nem departamento", async () => {
    /* Ela nasce efetivada, fica fora do fluxo de caixa e não há o que
       atribuir a um departamento: nada entrou nem saiu do escritório. */
    montar();
    expect(screen.queryByLabelText(/Situação/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Categoria/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Departamento/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Cliente/)).not.toBeInTheDocument();
  });

  it("e diz por quê, na própria tela", () => {
    montar();
    expect(
      screen.getByText(/não entra no fluxo de caixa: o dinheiro só muda de conta/),
    ).toBeInTheDocument();
  });
});

describe("as duas contas", () => {
  it("🔴 origem e destino IGUAIS: a tela recusa antes do servidor", async () => {
    montar();
    await escolher(/Conta de origem/, "Itaú");
    await escolher(/Conta de destino/, "Itaú");
    expect(
      await screen.findByText("A conta de destino tem de ser diferente da de origem."),
    ).toBeInTheDocument();
  });

  it("diferentes, o recado some -- o par negativo", async () => {
    montar();
    await escolher(/Conta de origem/, "Itaú");
    await escolher(/Conta de destino/, "Caixa do escritório");
    await waitFor(() =>
      expect(
        screen.queryByText("A conta de destino tem de ser diferente da de origem."),
      ).not.toBeInTheDocument(),
    );
  });

  it("faltando uma delas, não envia", async () => {
    montar();
    await escolher(/Conta de origem/, "Itaú");
    await userEvent.type(screen.getByLabelText(/Descrição/), "Reforço do caixa");
    await userEvent.type(screen.getByLabelText(/^Valor/), "50000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Escolha a conta de destino.")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

describe("a data", () => {
  it("🔴 no FUTURO é recusada: o saldo é o de hoje", async () => {
    montar();
    await escolher(/Conta de origem/, "Itaú");
    await escolher(/Conta de destino/, "Caixa do escritório");
    /* ⚠️ A data se escolhe no CALENDÁRIO -- `SeletorData` é um gatilho, não
       um input de texto. Um mês à frente já é futuro em qualquer dia do
       ano, o que evita um teste que só falha no fim do mês. */
    await userEvent.click(screen.getByLabelText(/^Data/));
    await userEvent.click(await screen.findByRole("button", { name: "Próximo mês" }));
    const dias = screen.getAllByRole("button", { name: /^Escolher / });
    await userEvent.click(dias[dias.length - 1]);
    await userEvent.type(screen.getByLabelText(/Descrição/), "Reforço do caixa");
    await userEvent.type(screen.getByLabelText(/^Valor/), "50000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("A transferência já aconteceu: a data não pode ser no futuro."),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

describe("envio", () => {
  it("manda as duas contas, o valor e a chave de criação", async () => {
    montar();
    await escolher(/Conta de origem/, "Itaú");
    await escolher(/Conta de destino/, "Caixa do escritório");
    await userEvent.type(screen.getByLabelText(/Descrição/), "Reforço do caixa");
    await userEvent.type(screen.getByLabelText(/^Valor/), "50000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const [dados, continuar] = onSalvar.mock.calls[0];
    expect(dados.conta_origem_id).toBe("c1");
    expect(dados.conta_destino_id).toBe("c2");
    expect(dados.valor_centavos).toBe(50000);
    expect(dados.chave_de_criacao).toBeTruthy();
    expect(continuar).toBe(false);
  });

  it("a recusa do servidor aparece no formulário", () => {
    montar("Conta desativada: escolha outra");
    expect(screen.getByText("Conta desativada: escolha outra")).toBeInTheDocument();
  });
});
