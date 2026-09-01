import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

import ModalDaInscricao from "./index";
import type { InscricaoAvulsa, Subgrupo } from "../../../../types";

const SUBGRUPOS: Subgrupo[] = [
  { subgrupo_id: "s-civel", nome: "Cível" },
  { subgrupo_id: "s-trab", nome: "Trabalhista" },
];

const salvarMock = vi.fn();
const fechar = vi.fn();

beforeEach(() => vi.clearAllMocks());

function montar(inscricao?: InscricaoAvulsa, subgrupos = SUBGRUPOS) {
  renderComProviders(
    <ModalDaInscricao
      inscricao={inscricao}
      subgrupos={subgrupos}
      carregandoSubgrupos={false}
      salvando={false}
      onSalvar={salvarMock}
      onFechar={fechar}
    />,
  );
}

const interruptor = () =>
  screen.getByRole("checkbox", { name: /Cadastrar sozinho os processos/ });
const confirmar = () => screen.getByRole("button", { name: /Adicionar|Salvar/ });

async function escolher(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await user.click(screen.getByLabelText(/Subgrupos de destino/));
  await user.click(await screen.findByText(nome));
}

// ── cadastrar ─────────────────────────────────────────────────────────────

describe("cadastrando uma inscrição nova", () => {
  it("manda número, UF, o interruptor desligado e destino vazio", async () => {
    /* ⚠️ Desligada é o lado seguro: cadastrar já faz o sistema acompanhar a
       inscrição, e ligar é a decisão cara -- ela manda a carga histórica
       buscar o passado inteiro daquela OAB. */
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "263");
    await user.click(screen.getByLabelText(/^UF/));
    await user.click(await screen.findByText("MG"));
    await user.click(confirmar());

    expect(salvarMock).toHaveBeenCalledWith("263", "MG", false, []);
  });

  it("o seletor de destino só aparece com o interruptor LIGADO", async () => {
    /* 🔴 Desligado, o servidor ZERA `subgrupos_destino` -- um campo cujo valor
       será descartado é um campo que mente. */
    const user = userEvent.setup();
    montar();

    expect(screen.queryByLabelText(/Subgrupos de destino/)).not.toBeInTheDocument();
    await user.click(interruptor());
    expect(screen.getByLabelText(/Subgrupos de destino/)).toBeInTheDocument();
  });

  it("ligado com destino, manda os dois juntos", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "263");
    await user.click(screen.getByLabelText(/^UF/));
    await user.click(await screen.findByText("MG"));
    await user.click(interruptor());
    await escolher(user, "Cível");
    await user.click(confirmar());

    expect(salvarMock).toHaveBeenCalledWith("263", "MG", true, ["s-civel"]);
  });
});

// ── 🔴 os dois estados que o servidor recusa e a tela prevê ───────────────

describe("o que não vai ao servidor", () => {
  it("ligado SEM destino trava o botão -- é o 400 que dá pra evitar", async () => {
    /* `DestinoDaImportacaoAusente`: ligar sem destino criaria processo sem
       lugar. Deixar mandar renderia um 400 que a pessoa leria como falha do
       sistema. */
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "263");
    await user.click(screen.getByLabelText(/^UF/));
    await user.click(await screen.findByText("MG"));
    await user.click(interruptor());

    expect(confirmar()).toBeDisabled();
  });

  it("mas DESLIGADO sem destino passa -- senão nada seria cadastrável", async () => {
    /* O par negativo: a trava é sobre "ligado sem destino", não sobre "sem
       destino". */
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "263");
    await user.click(screen.getByLabelText(/^UF/));
    await user.click(await screen.findByText("MG"));

    expect(confirmar()).toBeEnabled();
  });

  it("número com letra não vai, e o erro aparece no campo certo", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "abc");
    await user.click(screen.getByLabelText(/^UF/));
    await user.click(await screen.findByText("MG"));
    await user.click(confirmar());

    expect(salvarMock).not.toHaveBeenCalled();
    expect(screen.getByText("O número da OAB tem só dígitos")).toBeInTheDocument();
  });

  it("o erro de formato só aparece depois de TENTAR", async () => {
    /* Mostrá-lo enquanto a pessoa digita acusaria "informe o número" no
       primeiro caractere. */
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText(/Número/), "2");
    expect(screen.queryByText(/Selecione a UF/)).not.toBeInTheDocument();
  });
});

// ── editar ────────────────────────────────────────────────────────────────

describe("editando uma inscrição que já existe", () => {
  const LIGADA: InscricaoAvulsa = {
    inscricao: "263/MG",
    importacao_automatica: true,
    subgrupos_destino: ["s-civel"],
  };

  it("abre com o que está gravado -- e não vazio", async () => {
    montar(LIGADA);

    /* ⚠️ `toHaveValue` nos DOIS: editando, a UF é um `Input` travado, e não o
       `Select` -- ver o comentário no componente. */
    expect(screen.getByLabelText(/Número/)).toHaveValue("263");
    expect(screen.getByLabelText(/^UF/)).toHaveValue("MG");
    expect(interruptor()).toBeChecked();
    expect(screen.getByText("Cível")).toBeInTheDocument();
  });

  it("🔴 número e UF ficam DESABILITADOS -- trocá-los seria outra inscrição", async () => {
    /* A mutação que este teste mata: deixar os campos editáveis. Trocar o
       número não editaria nada -- criaria uma segunda inscrição, e a antiga
       ficaria na lista sem ninguém ver.

       ⚠️ Desabilitados e não ESCONDIDOS: sumir com eles deixaria quem abriu o
       modal sem saber qual inscrição está editando. */
    montar(LIGADA);

    expect(screen.getByLabelText(/Número/)).toBeDisabled();
    expect(screen.getByLabelText(/^UF/)).toBeDisabled();
  });

  it("e cadastrando, eles são editáveis -- senão não haveria como cadastrar", async () => {
    /* O par negativo do de cima. */
    montar();
    expect(screen.getByLabelText(/Número/)).toBeEnabled();
    expect(screen.getByLabelText(/^UF/)).toBeEnabled();
  });

  it("desligar pelo modal manda o destino vazio, espelhando o servidor", async () => {
    const user = userEvent.setup();
    montar(LIGADA);

    await user.click(interruptor());
    await user.click(confirmar());

    expect(salvarMock).toHaveBeenCalledWith("263", "MG", false, []);
  });
});

it("sem subgrupo nenhum, o interruptor trava e diz o que fazer", async () => {
  montar(undefined, []);

  expect(interruptor()).toBeDisabled();
  expect(screen.getByText("Crie um subgrupo para poder ligar.")).toBeInTheDocument();
});
