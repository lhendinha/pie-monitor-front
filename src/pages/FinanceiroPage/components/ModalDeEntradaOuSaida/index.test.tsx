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
import ModalDeEntradaOuSaida from ".";

const CATALOGO = {
  contas: [
    { conta_id: "c1", nome: "Itaú", tipo: "corrente", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
    { conta_id: "c2", nome: "Caixa velho", tipo: "outros", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: false },
  ],
  categorias: [
    { categoria_id: "cat1", nome: "Reembolso", natureza: "entrada", cor: "#1f9d55",
      agrupador_id: "", ativa: true },
    { categoria_id: "imp", nome: "Impostos", natureza: "saida", cor: "#d64550",
      agrupador_id: "", ativa: true },
    { categoria_id: "das", nome: "DAS", natureza: "saida", cor: "#d64550",
      agrupador_id: "imp", ativa: true },
  ],
  centros_de_custo: [{ centro_id: "cc1", nome: "Filial BH", ativo: true }],
  conta_padrao_id: "c1",
  cores_disponiveis: ["#1f9d55"],
};

const onSalvar = vi.fn();
const onFechar = vi.fn();
const onTrocarParaHonorario = vi.fn();

function montar(natureza = "entrada") {
  return renderComProviders(
    <ModalDeEntradaOuSaida
      natureza={natureza}
      catalogo={CATALOGO}
      onSalvar={onSalvar}
      onFechar={onFechar}
      onTrocarParaHonorario={onTrocarParaHonorario}
    />,
  );
}

/** Preenche o mínimo que o formulário exige e envia. */
async function preencherEEnviar(extra: () => Promise<void> = async () => {}) {
  await userEvent.type(screen.getByLabelText(/Descrição/), "Reembolso de custas");
  await userEvent.type(screen.getByLabelText(/^Valor/), "25000");
  await extra();
  await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarClientes.mockResolvedValue({
    clientes: [{ cliente_id: "cl1", nome: "Construtora Alfa" }],
  });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "civel", nome: "Cível", grupo_id: "g1" },
      { subgrupo_id: "trab", nome: "Trabalhista", grupo_id: "g1" },
    ],
  });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana" }],
  });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.getEmail.mockReturnValue("ana@x.com");
});

describe("entrada e saída dizem coisas diferentes", () => {
  it("na ENTRADA, o título e os rótulos são de quem recebe", async () => {
    montar("entrada");
    expect(screen.getByText("Nova entrada")).toBeInTheDocument();
    expect(screen.getByLabelText(/Recebida de/)).toBeInTheDocument();
    expect(screen.getByLabelText(/A receber em/)).toBeInTheDocument();
  });

  it("na SAÍDA, são de quem paga -- o par negativo", async () => {
    montar("saida");
    expect(screen.getByText("Nova saída")).toBeInTheDocument();
    expect(screen.getByLabelText(/Paga para/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Vencimento/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Recebida de/)).not.toBeInTheDocument();
  });

  it("🔴 as categorias saem pela NATUREZA, e a agrupadora fica de fora", async () => {
    /* Uma saída com categoria de entrada faz o fluxo de caixa se
       contradizer; a agrupadora não aceita lançamento nenhum. */
    montar("saida");
    await userEvent.click(screen.getByLabelText(/Categoria/));
    expect(await screen.findByRole("option", { name: "Impostos › DAS" })).toBeInTheDocument();
    expect(screen.queryByText("Reembolso")).not.toBeInTheDocument();
    /* "Impostos" sozinha é a agrupadora -- só existe dentro do rótulo da
       filha, nunca como opção. */
    expect(screen.queryByText("Impostos")).not.toBeInTheDocument();
  });

  it("conta desativada não é oferecida", async () => {
    montar("entrada");
    await userEvent.click(screen.getByLabelText(/^Conta/));
    expect(await screen.findByRole("option", { name: "Itaú" })).toBeInTheDocument();
    expect(screen.queryByText("Caixa velho")).not.toBeInTheDocument();
  });
});

describe("cliente OU contraparte", () => {
  it("🔴 'Despesa de cliente' troca 'Paga para' pelo campo de CLIENTE", async () => {
    /* A API recusa os dois juntos. O artefato mostrava os dois; aqui só um
       existe por vez, e por isso não há estado que dê 400. */
    montar("saida");
    await userEvent.click(screen.getByLabelText(/^Tipo/));
    await userEvent.click(await screen.findByRole("option", { name: "Despesa de cliente" }));

    expect(await screen.findByLabelText(/Cliente/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Paga para/)).not.toBeInTheDocument();
  });

  it("🔴 e LIMPA o que estava digitado no campo que sumiu", async () => {
    /* Sem isto, "Equatorial" continuaria no estado e viajaria junto do
       cliente -- 400 falando de um campo que não está mais na tela. */
    montar("saida");
    await userEvent.type(screen.getByLabelText(/Paga para/), "Equatorial");
    await userEvent.click(screen.getByLabelText(/^Tipo/));
    await userEvent.click(await screen.findByRole("option", { name: "Despesa de cliente" }));
    await userEvent.click(screen.getByLabelText(/^Tipo/));
    await userEvent.click(await screen.findByRole("option", { name: "Saída avulsa" }));

    expect(screen.getByLabelText<HTMLInputElement>(/Paga para/).value).toBe("");
  });

  it("despesa de cliente EXIGE o cliente", async () => {
    montar("saida");
    await userEvent.click(screen.getByLabelText(/^Tipo/));
    await userEvent.click(await screen.findByRole("option", { name: "Despesa de cliente" }));
    await preencherEEnviar();
    expect(await screen.findByText("Escolha o cliente.")).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it("sem cliente, a contraparte é obrigatória", async () => {
    montar("entrada");
    await preencherEEnviar();
    expect(
      await screen.findByText("Informe de quem veio ou para quem foi."),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

describe("a porta do honorário", () => {
  it("🔴 escolher 'Honorário' TROCA de modal, e não muda este", async () => {
    montar("entrada");
    await userEvent.click(screen.getByLabelText(/^Tipo/));
    await userEvent.click(await screen.findByRole("option", { name: "Honorário" }));

    expect(onTrocarParaHonorario).toHaveBeenCalledTimes(1);
    /* E o Tipo NÃO ficou em "Honorário": este formulário não sabe fazer um. */
    expect(screen.getByText("Entrada avulsa")).toBeInTheDocument();
  });

  it("a saída não oferece essa porta", async () => {
    montar("saida");
    await userEvent.click(screen.getByLabelText(/^Tipo/));
    expect(await screen.findByRole("option", { name: "Despesa de cliente" })).toBeInTheDocument();
    expect(screen.queryByText("Honorário")).not.toBeInTheDocument();
  });
});

describe("repetir mensalmente", () => {
  it("aparece num lançamento em aberto", async () => {
    montar("saida");
    expect(screen.getByText("Repetir mensalmente")).toBeInTheDocument();
  });

  it("🔴 SOME quando a situação é 'já paga'", async () => {
    /* A API recusa série que nasce efetivada: doze aluguéis pagos de uma vez
       é engano de quem preencheu, e cada um moveria o saldo. */
    montar("saida");
    await userEvent.click(screen.getByLabelText(/^Situação/));
    await userEvent.click(await screen.findByRole("option", { name: "Paga" }));
    await waitFor(() =>
      expect(screen.queryByText("Repetir mensalmente")).not.toBeInTheDocument(),
    );
  });

  it("e o rótulo da data vira 'Paga em'", async () => {
    montar("saida");
    await userEvent.click(screen.getByLabelText(/^Situação/));
    await userEvent.click(await screen.findByRole("option", { name: "Paga" }));
    expect(await screen.findByLabelText(/Paga em/)).toBeInTheDocument();
  });
});

describe("o que vai para o servidor", () => {
  async function escolherDepartamento() {
    await userEvent.click(screen.getByLabelText(/Departamento/));
    await userEvent.click(await screen.findByRole("option", { name: "Cível" }));
  }

  it("🔴 manda o rateio de UMA linha SEM valor", async () => {
    /* O valor da parcela única só pode ser o do lançamento -- mandá-lo de
       novo criaria duas fontes para o mesmo número. */
    montar("entrada");
    await userEvent.type(screen.getByLabelText(/Recebida de/), "Fulano");
    await userEvent.click(screen.getByLabelText(/Categoria/));
    await userEvent.click(await screen.findByRole("option", { name: "Reembolso" }));
    await userEvent.click(screen.getByLabelText(/^Conta/));
    await userEvent.click(await screen.findByRole("option", { name: "Itaú" }));
    await preencherEEnviar(escolherDepartamento);

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const [dados, repetir, continuar] = onSalvar.mock.calls[0];
    expect(dados.rateio).toEqual([{ subgrupo_id: "civel" }]);
    expect(dados.valor_centavos).toBe(25000);
    expect(dados.contraparte).toBe("Fulano");
    expect(dados.chave_de_criacao).toBeTruthy();
    /* Aberto: nada de `data_efetivacao`. */
    expect(dados.data_efetivacao).toBeUndefined();
    expect(repetir).toBe(false);
    expect(continuar).toBe(false);
  });

  it("🔴 'Salvar e adicionar outra' avisa que é para CONTINUAR", async () => {
    montar("entrada");
    await userEvent.type(screen.getByLabelText(/Recebida de/), "Fulano");
    await userEvent.click(screen.getByLabelText(/Categoria/));
    await userEvent.click(await screen.findByRole("option", { name: "Reembolso" }));
    await userEvent.click(screen.getByLabelText(/^Conta/));
    await userEvent.click(await screen.findByRole("option", { name: "Itaú" }));
    await userEvent.type(screen.getByLabelText(/Descrição/), "Reembolso");
    await userEvent.type(screen.getByLabelText(/^Valor/), "25000");
    await escolherDepartamento();
    await userEvent.click(screen.getByRole("button", { name: "Salvar e adicionar outra" }));

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    expect(onSalvar.mock.calls[0][2]).toBe(true);
  });

  it("marcar 'Paga' manda a data do CAMPO como efetivação", async () => {
    /* Não é "hoje": "Paga em 15/09" quer dizer que saiu no dia 15. */
    montar("saida");
    await userEvent.click(screen.getByLabelText(/^Situação/));
    await userEvent.click(await screen.findByRole("option", { name: "Paga" }));
    await userEvent.type(screen.getByLabelText(/Paga para/), "Equatorial");
    await userEvent.click(screen.getByLabelText(/Categoria/));
    await userEvent.click(await screen.findByRole("option", { name: "Impostos › DAS" }));
    await userEvent.click(screen.getByLabelText(/^Conta/));
    await userEvent.click(await screen.findByRole("option", { name: "Itaú" }));
    await preencherEEnviar(escolherDepartamento);

    await waitFor(() => expect(onSalvar).toHaveBeenCalled());
    const dados = onSalvar.mock.calls[0][0];
    expect(dados.data_efetivacao).toBe(dados.data_vencimento);
  });

  it("a recusa do servidor aparece no FORMULÁRIO", async () => {
    renderComProviders(
      <ModalDeEntradaOuSaida
        natureza="entrada"
        catalogo={CATALOGO}
        erro="Conta desativada: escolha outra"
        onSalvar={onSalvar}
        onFechar={onFechar}
      />,
    );
    expect(screen.getByText("Conta desativada: escolha outra")).toBeInTheDocument();
  });
});
