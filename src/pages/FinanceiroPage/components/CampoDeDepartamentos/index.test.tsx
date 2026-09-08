import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listarSubgrupos: vi.fn(),
  papelAtende: vi.fn(() => true),
}));
vi.mock("../../../../services", () => mocks);

import { renderComProviders } from "../../../../test/queryTestUtils";
import CampoDeDepartamentos from ".";
import type { ParcelaParaEnviar } from "../../../../types";

const onMudar = vi.fn();

function montar(valor: ParcelaParaEnviar[], total: number | null = 1000_00) {
  return renderComProviders(
    <CampoDeDepartamentos
      id="dep"
      valor={valor}
      onMudar={onMudar}
      valorTotalCentavos={total}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "civel", nome: "Cível", grupo_id: "g1" },
      { subgrupo_id: "trab", nome: "Trabalhista", grupo_id: "g1" },
    ],
  });
});

describe("o caminho comum: um departamento", () => {
  it("é UM select, sem coluna de valor", () => {
    /* Duas colunas para quem tem um departamento só cobrariam uma decisão
       que ninguém tem. */
    montar([{ subgrupo_id: "civel" }]);
    /* Nenhum campo de dinheiro na tela -- o `combobox` do departamento não é
       `textbox`. */
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Dividir entre departamentos" }))
      .toBeInTheDocument();
  });

  it("escolher troca o departamento sem inventar valor", async () => {
    montar([{ subgrupo_id: "" }]);
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "Trabalhista" }));
    expect(onMudar).toHaveBeenCalledWith([{ subgrupo_id: "trab" }]);
  });
});

describe("dividir", () => {
  it("🔴 abrir a divisão dá o valor INTEIRO ao primeiro", async () => {
    /* Dividir ao meio faria a soma fechar por acaso; dar o total ao primeiro
       mantém a conta certa enquanto a pessoa ainda não decidiu. */
    montar([{ subgrupo_id: "civel" }], 1000_00);
    await userEvent.click(screen.getByRole("button", { name: "Dividir entre departamentos" }));
    expect(onMudar).toHaveBeenCalledWith([
      { subgrupo_id: "civel", valor_centavos: 100000 },
      { subgrupo_id: "", valor_centavos: 0 },
    ]);
  });

  it("com duas linhas, cada uma tem seu valor", () => {
    montar([
      { subgrupo_id: "civel", valor_centavos: 60000 },
      { subgrupo_id: "trab", valor_centavos: 40000 },
    ]);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("🔴 diz quanto FALTA distribuir", async () => {
    montar([
      { subgrupo_id: "civel", valor_centavos: 60000 },
      { subgrupo_id: "trab", valor_centavos: 0 },
    ], 1000_00);
    expect(screen.getByText("Falta distribuir R$ 400,00")).toBeInTheDocument();
  });

  it("🔴 e avisa quando PASSOU do valor", () => {
    /* O outro lado: somar mais que o lançamento é o erro que a API recusa
       com 400, e ele precisa aparecer antes do envio. */
    montar([
      { subgrupo_id: "civel", valor_centavos: 90000 },
      { subgrupo_id: "trab", valor_centavos: 30000 },
    ], 1000_00);
    expect(
      screen.getByText("Passou R$ 200,00 do valor do lançamento"),
    ).toBeInTheDocument();
  });

  it("fechando a conta, nenhum recado aparece -- o par negativo", () => {
    montar([
      { subgrupo_id: "civel", valor_centavos: 60000 },
      { subgrupo_id: "trab", valor_centavos: 40000 },
    ], 1000_00);
    expect(screen.queryByText(/Falta distribuir/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Passou/)).not.toBeInTheDocument();
  });

  it("🔴 voltar a UMA linha tira o valor junto", async () => {
    /* Com uma parcela o valor só pode ser o do lançamento -- deixá-lo faria
       a tela mandar o mesmo número duas vezes. */
    montar([
      { subgrupo_id: "civel", valor_centavos: 60000 },
      { subgrupo_id: "trab", valor_centavos: 40000 },
    ]);
    const remover = screen.getAllByRole("button", { name: "Remover" });
    await userEvent.click(remover[1]);
    expect(onMudar).toHaveBeenCalledWith([{ subgrupo_id: "civel" }]);
  });

  it("no teto de 20, para de oferecer 'Adicionar departamento'", () => {
    const cheio = Array.from({ length: 20 }, (_, i) => ({
      subgrupo_id: `s${i}`,
      valor_centavos: 5000,
    }));
    montar(cheio, 100000);
    expect(
      screen.queryByRole("button", { name: "Adicionar departamento" }),
    ).not.toBeInTheDocument();
  });

  it("abaixo do teto, oferece -- o par negativo", () => {
    montar(
      [
        { subgrupo_id: "civel", valor_centavos: 60000 },
        { subgrupo_id: "trab", valor_centavos: 40000 },
      ],
      1000_00,
    );
    expect(
      screen.getByRole("button", { name: "Adicionar departamento" }),
    ).toBeInTheDocument();
  });
});
