import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  lerConfiguracoesDoGrupo: vi.fn(),
  atualizarConfiguracoesDoGrupo: vi.fn(),
  listarSubgrupos: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import InscricoesDoGrupo from "./index";
import type { ConfiguracoesDoGrupo, InscricaoAvulsa } from "../../../../types";

const CIVEL = { subgrupo_id: "s-civel", nome: "Cível" };
const TRAB = { subgrupo_id: "s-trab", nome: "Trabalhista" };

const UMA: InscricaoAvulsa = {
  inscricao: "263/MG",
  importacao_automatica: false,
  subgrupos_destino: [],
};

function configuracoes(oabs: InscricaoAvulsa[], maximo = 50): ConfiguracoesDoGrupo {
  return {
    nome: "Silva Advogados",
    nome_tamanho_maximo: 120,
    dias_para_arquivar: 7,
    dias_para_arquivar_minimo: 1,
    dias_para_arquivar_maximo: 365,
    dias_para_arquivar_padrao: 7,
    oabs_avulsas: oabs,
    oabs_avulsas_maximo: maximo,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lerConfiguracoesDoGrupo.mockResolvedValue(configuracoes([UMA]));
  mocks.atualizarConfiguracoesDoGrupo.mockImplementation(async () => configuracoes([UMA]));
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [CIVEL, TRAB],
    total: 2,
    total_paginas: 1,
  });
});

async function montar() {
  renderComProviders(<InscricoesDoGrupo />);
  return await screen.findByRole("button", { name: "Adicionar inscrição" });
}

/** O corpo do último PATCH. ⚠️ Sem `.at(-1)`: o `lib` do `tsconfig` é anterior
 * a ES2022, e o `vitest` não checa tipo -- quem pega é o `yarn build`. */
function ultimoCorpo() {
  const chamadas = mocks.atualizarConfiguracoesDoGrupo.mock.calls;
  return chamadas[chamadas.length - 1][0];
}

/** A lista FECHADA que foi ao servidor no último PATCH. */
const enviado = () => ultimoCorpo().oabs_avulsas;

/** Cadastra pelo modal: abre, preenche as duas partes e confirma. */
async function cadastrar(
  user: ReturnType<typeof userEvent.setup>,
  numero: string,
  uf: string,
) {
  await user.click(screen.getByRole("button", { name: "Adicionar inscrição" }));
  await user.type(await screen.findByLabelText(/Número/), numero);
  await user.click(screen.getByLabelText(/^UF/));
  await user.click(await screen.findByText(uf));
  await user.click(screen.getByRole("button", { name: "Adicionar" }));
}

async function removerAPrimeira(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Remover 263/MG" }));
  await user.click(await screen.findByRole("button", { name: "Remover" }));
}

// ── 🔴 a releitura antes de gravar ────────────────────────────────────────

describe("toda gravação relê a lista antes de montar o corpo", () => {
  it("não apaga a inscrição que outra pessoa cadastrou enquanto a tela estava aberta", async () => {
    /* 🔴 O defeito que isto impede é PERDA SILENCIOSA DE DADO -- a pior
       classe. O PATCH substitui a lista inteira: quem manda a lista sem uma
       inscrição a está removendo. Montando o corpo a partir do cache, um
       `admin` que abrisse a tela, esperasse o colega cadastrar uma OAB e então
       mexesse em outra apagaria a do colega junto, sem erro e sem toast.

       A mutação que este teste mata: trocar a releitura por `query.data`. */
    const DO_COLEGA: InscricaoAvulsa = {
      inscricao: "999/SP",
      importacao_automatica: false,
      subgrupos_destino: [],
    };
    mocks.lerConfiguracoesDoGrupo
      /* A tela abre vendo SÓ a `263/MG`... */
      .mockResolvedValueOnce(configuracoes([UMA]))
      /* ...e a releitura da gravação encontra a do colega já lá. */
      .mockResolvedValue(configuracoes([UMA, DO_COLEGA]));
    const user = userEvent.setup();
    await montar();

    await removerAPrimeira(user);

    await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
    expect(enviado()).toEqual([
      { numero: "999", uf: "SP", importacao_automatica: false, subgrupos_destino: [] },
    ]);
  });

  it("e a releitura acontece ANTES do PATCH, não depois", async () => {
    /* A concordância do teste acima: ele passaria também se a releitura
       rodasse depois e o corpo tivesse vindo do cache por coincidência. Aqui a
       ordem é medida. */
    const ordem: string[] = [];
    mocks.lerConfiguracoesDoGrupo.mockImplementation(async () => {
      ordem.push("leu");
      return configuracoes([UMA]);
    });
    mocks.atualizarConfiguracoesDoGrupo.mockImplementation(async () => {
      ordem.push("gravou");
      return configuracoes([]);
    });
    const user = userEvent.setup();
    await montar();

    await removerAPrimeira(user);

    await waitFor(() => expect(ordem).toContain("gravou"));
    /* Duas leituras: a de abrir a tela e a de conferir antes de gravar. */
    expect(ordem).toEqual(["leu", "leu", "gravou"]);
  });
});

// ── a forma do corpo ──────────────────────────────────────────────────────

it("manda `numero`/`uf` SEPARADOS, e só o campo das inscrições", async () => {
  /* 🔴 A assimetria do servidor: o `GET` devolve `"263/MG"` e o `PATCH` pede
     as duas partes. Mandando junto, o schema recusa a lista inteira -- e o que
     se perderia é a inscrição que a pessoa nem tocou.

     ⚠️ E só `oabs_avulsas`: mandar `nome` junto faria um mexer na lista
     sobrescrever um renome que outra pessoa acabou de salvar. */
  const user = userEvent.setup();
  await montar();

  await cadastrar(user, "999", "SP");

  await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  expect(Object.keys(ultimoCorpo())).toEqual(["oabs_avulsas"]);
  expect(enviado()).toEqual([
    { numero: "263", uf: "MG", importacao_automatica: false, subgrupos_destino: [] },
    { numero: "999", uf: "SP", importacao_automatica: false, subgrupos_destino: [] },
  ]);
});

// ── 🔴 a repetida, que o servidor ignora em silêncio ──────────────────────

describe("inscrição repetida", () => {
  it("é barrada AQUI, sem chamar o servidor", async () => {
    /* 🔴 `definir_oabs_avulsas` ignora a repetida em silêncio -- "a primeira
       vence". Mandando assim, o PATCH responderia 200 com a lista do mesmo
       tamanho, e a pessoa concluiria que a tela engoliu o cadastro. */
    const user = userEvent.setup();
    await montar();

    await cadastrar(user, "263", "MG");

    expect(screen.getByText("Esta inscrição já está na lista.")).toBeInTheDocument();
    expect(mocks.atualizarConfiguracoesDoGrupo).not.toHaveBeenCalled();
  });

  it("e uma inscrição DIFERENTE passa -- senão o bloqueio pegaria todas", async () => {
    /* O par negativo: "não chama o servidor" passaria também num componente
       que nunca chamasse. */
    const user = userEvent.setup();
    await montar();

    await cadastrar(user, "999", "SP");

    await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  });

  it("o modal continua ABERTO com o erro -- fechá-lo levaria o que foi digitado", async () => {
    const user = userEvent.setup();
    await montar();

    await cadastrar(user, "263", "MG");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// ── editar reescreve, não duplica ─────────────────────────────────────────

it("🔴 editar REESCREVE a inscrição no lugar, e não acrescenta uma segunda", async () => {
  /* A mutação que este teste mata: um `aplicar` que sempre concatena. A tela
     mostraria a `263/MG` duas vezes, e o servidor guardaria a primeira -- ou
     seja, a edição seria descartada em silêncio. */
  const user = userEvent.setup();
  await montar();

  await user.click(screen.getByRole("button", { name: "263/MG" }));
  await user.click(await screen.findByText("Cadastrar sozinho os processos desta inscrição"));
  await user.click(screen.getByLabelText(/Subgrupos de destino/));
  await user.click(await screen.findByText("Cível"));
  await user.click(screen.getByRole("button", { name: "Salvar" }));

  await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  expect(enviado()).toEqual([
    { numero: "263", uf: "MG", importacao_automatica: true, subgrupos_destino: ["s-civel"] },
  ]);
});

// ── desligar pela linha ───────────────────────────────────────────────────

it("desligar pela linha manda o destino VAZIO, espelhando o servidor", async () => {
  /* ⚠️ O servidor zera de qualquer jeito. Mandar o destino cheio com o
     interruptor em `false` faria a tela e o banco discordarem sobre o que foi
     pedido -- e a resposta traria a lista vazia de volta. */
  mocks.lerConfiguracoesDoGrupo.mockResolvedValue(
    configuracoes([
      { inscricao: "263/MG", importacao_automatica: true, subgrupos_destino: ["s-civel"] },
    ]),
  );
  const user = userEvent.setup();
  await montar();

  await user.click(await screen.findByRole("checkbox", { name: "263/MG Ligada" }));

  await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  expect(enviado()).toEqual([
    { numero: "263", uf: "MG", importacao_automatica: false, subgrupos_destino: [] },
  ]);
});

// ── o teto ────────────────────────────────────────────────────────────────

describe("a lista cheia", () => {
  const CHEIA = [
    UMA,
    { inscricao: "999/SP", importacao_automatica: false, subgrupos_destino: [] },
  ];

  it("trava o botão e explica, em vez de deixar tomar 400", async () => {
    mocks.lerConfiguracoesDoGrupo.mockResolvedValue(configuracoes(CHEIA, 2));
    await montar();

    expect(screen.getByRole("button", { name: "Adicionar inscrição" })).toBeDisabled();
    expect(
      screen.getByText("Limite atingido. Remova uma para cadastrar outra."),
    ).toBeInTheDocument();
  });

  it("com uma vaga sobrando, segue liberado", async () => {
    /* O par negativo do teto: `>=` errado como `>` deixaria cadastrar a 51ª, e
       `<=` travaria uma vaga cedo demais. */
    mocks.lerConfiguracoesDoGrupo.mockResolvedValue(configuracoes(CHEIA, 3));
    await montar();

    expect(screen.getByRole("button", { name: "Adicionar inscrição" })).toBeEnabled();
  });
});

// ── o resto ───────────────────────────────────────────────────────────────

it("mostra o contador do teto, e não só quando ele enche", async () => {
  /* O limite de 50 é carga contra um tribunal, não espaço: quem descobre que
     ele existe só ao esbarrar nele já planejou errado. */
  await montar();
  expect(screen.getByText("1 de 50")).toBeInTheDocument();
});

it("lista o que veio do servidor", async () => {
  await montar();
  expect(screen.getByText("263/MG")).toBeInTheDocument();
});

it("lista vazia diz que não há nenhuma -- e não some a tabela sem explicação", async () => {
  mocks.lerConfiguracoesDoGrupo.mockResolvedValue(configuracoes([]));
  await montar();

  expect(screen.getByText("Nenhuma inscrição cadastrada.")).toBeInTheDocument();
});

it("remover PERGUNTA antes, e desistir não grava nada", async () => {
  const user = userEvent.setup();
  await montar();

  await user.click(screen.getByRole("button", { name: "Remover 263/MG" }));
  expect(await screen.findByText(/deixa de ser acompanhada/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(mocks.atualizarConfiguracoesDoGrupo).not.toHaveBeenCalled();
});

it("a resposta do PATCH é o que fica na tela -- ela é quem manda", async () => {
  /* O servidor normaliza, deduplica e pode reescrever o que foi enviado.
     Plantar a resposta evita a tela afirmar o que ela mandou em vez do que
     ficou gravado -- é a mesma razão do `invalidateQueries` do perfil, sem a
     ida a mais ao servidor. */
  mocks.atualizarConfiguracoesDoGrupo.mockResolvedValue(
    configuracoes([{ inscricao: "111/RJ", importacao_automatica: false, subgrupos_destino: [] }]),
  );
  const user = userEvent.setup();
  await montar();

  await removerAPrimeira(user);

  expect(await screen.findByText("111/RJ")).toBeInTheDocument();
  expect(screen.queryByText("263/MG")).not.toBeInTheDocument();
});
