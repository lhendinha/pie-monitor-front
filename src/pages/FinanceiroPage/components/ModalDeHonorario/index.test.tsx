import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listarClientes: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
  getEmail: vi.fn(),
  papelAtende: vi.fn(() => true),
}));
vi.mock("../../../../services", () => mocks);

import { renderComProviders } from "../../../../test/queryTestUtils";
import ModalDeHonorario from ".";

const CATALOGO = {
  contas: [{ conta_id: "c1", nome: "Itaú", tipo: "corrente", inicio: "2026-01-01",
             saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true }],
  categorias: [{ categoria_id: "cat1", nome: "Honorários", natureza: "entrada",
                 cor: "#1f9d55", agrupador_id: "", ativa: true }],
  centros_de_custo: [],
  conta_padrao_id: "c1",
  cores_disponiveis: ["#1f9d55"],
};

const PROCESSO = {
  cliente_nomes: ["Construtora Alfa"],
  numero_processo: "00002668720218130559",
  subgrupo_id: "civel",
  apelido: "Alfa x Beta",
  cliente_ids: ["cl1"],
};

const onSalvar = vi.fn();
const onFechar = vi.fn();

function montar() {
  return renderComProviders(
    <ModalDeHonorario catalogo={CATALOGO} onSalvar={onSalvar} onFechar={onFechar} />,
  );
}

/** Escolhe o processo pelo campo de vínculo -- a busca dispara pelo texto. */
async function escolherOProcesso() {
  await userEvent.type(screen.getByLabelText(/Processo ou atendimento/), "Alfa");
  await userEvent.click(await screen.findByText(/Alfa x Beta/));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarClientes.mockResolvedValue({
    clientes: [
      { cliente_id: "cl1", nome: "Construtora Alfa" },
      { cliente_id: "cl2", nome: "Outro cliente" },
    ],
  });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "civel", nome: "Cível", grupo_id: "g1" },
      { subgrupo_id: "trab", nome: "Trabalhista", grupo_id: "g1" },
    ],
  });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarProcessos.mockResolvedValue({ processos: [PROCESSO] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.getEmail.mockReturnValue("ana@x.com");
});

describe("parcelas", () => {
  it("com 1, a frase diz que é um lançamento só", () => {
    montar();
    expect(screen.getByText("Um lançamento só.")).toBeInTheDocument();
  });

  it("🔴 a partir de 2, diz QUANTOS lançamentos vão nascer", async () => {
    /* O número sozinho não diz o que faz: "3" pode ser lido como "dividido
       em três". */
    montar();
    const campo = screen.getByLabelText(/Parcelas/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "3");
    expect(
      await screen.findByText(
        "3 lançamentos, um por mês, cada um com o valor da parcela.",
      ),
    ).toBeInTheDocument();
  });

  it("recusa 0", async () => {
    montar();
    const campo = screen.getByLabelText(/Parcelas/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "0");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Parcelas tem de ser de 1 a 60.")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("recusa 61 -- o outro lado da faixa", async () => {
    montar();
    const campo = screen.getByLabelText(/Parcelas/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "61");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Parcelas tem de ser de 1 a 60.")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("aceita 60", async () => {
    montar();
    const campo = screen.getByLabelText(/Parcelas/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "60");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.queryByText("Parcelas tem de ser de 1 a 60.")).not.toBeInTheDocument();
  });
});

describe("o que o vínculo sugere", () => {
  it("🔴 processo de UM cliente preenche o cliente -- e ele continua editável", async () => {
    montar();
    await escolherOProcesso();
    expect(await screen.findByText("Construtora Alfa")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/^Cliente/));
    await userEvent.click(await screen.findByRole("option", { name: "Outro cliente" }));
    expect(await screen.findByText("Outro cliente")).toBeInTheDocument();
  });

  it("🔴 e sugere o DEPARTAMENTO pelo subgrupo do processo", async () => {
    /* É o mesmo subgrupo que vai junto do vínculo para a API -- sem ele, a
       resposta é "Vínculo sem subgrupo". */
    montar();
    await escolherOProcesso();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
  });

  it("processo de DOIS clientes não escolhe por conta própria", async () => {
    /* Par negativo: chutar de quem se cobra é pior que perguntar. */
    mocks.listarProcessos.mockResolvedValue({
      processos: [{ ...PROCESSO, cliente_ids: ["cl1", "cl2"] }],
    });
    montar();
    await escolherOProcesso();
    /* Escolhido: a etiqueta mostra o número mascarado, não mais o apelido. */
    expect(await screen.findByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
    expect(screen.queryByText("Construtora Alfa")).not.toBeInTheDocument();
  });
});

describe("o que o formulário exige", () => {
  it("cliente e vínculo são obrigatórios aqui", async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/Descrição/), "Honorários da contestação");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Escolha o processo ou o atendimento.")).toBeInTheDocument();
    expect(screen.getByText("Escolha o cliente.")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("🔴 preenchido, manda o vínculo COM o subgrupo e o número de parcelas", async () => {
    montar();
    await escolherOProcesso();
    await userEvent.type(screen.getByLabelText(/Descrição/), "Honorários da contestação");
    await userEvent.type(screen.getByLabelText(/Valor da parcela/), "100000");
    await userEvent.click(screen.getByLabelText(/Categoria/));
    await userEvent.click(await screen.findByRole("option", { name: "Honorários" }));
    await userEvent.click(screen.getByLabelText(/^Conta/));
    await userEvent.click(await screen.findByRole("option", { name: "Itaú" }));
    const parcelas = screen.getByLabelText(/Parcelas/);
    await userEvent.clear(parcelas);
    await userEvent.type(parcelas, "3");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const [dados, quantas] = onSalvar.mock.calls[0];
    expect(quantas).toBe(3);
    expect(dados.numero_processo).toBe(PROCESSO.numero_processo);
    expect(dados.subgrupo_id).toBe("civel");
    expect(dados.cliente_id).toBe("cl1");
    /* O valor é o DE CADA parcela -- é isso que elimina a divisão. */
    expect(dados.valor_centavos).toBe(100000);
    expect(dados.rateio).toEqual([{ subgrupo_id: "civel" }]);
    /* Cliente escolhido: nada de contraparte junto, ou o servidor recusa. */
    expect(dados.contraparte).toBeUndefined();
  });
});
