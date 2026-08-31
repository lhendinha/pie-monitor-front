import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  lerMeuPerfil: vi.fn(),
  atualizarMeuPerfil: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import FormularioDaInscricao from "./index";
import type { MeuPerfil } from "../../../../types";

/* ⚠️ Anotado como `MeuPerfil`, e não inferido: sem a anotação o TypeScript
   deduz `numero_oab: string` do valor de exemplo, e os testes de "quem não tem
   inscrição" não compilam. O `vitest` não checa tipo -- quem pega é o build. */
const PERFIL: MeuPerfil = {
  email: "marina@escritorio.test",
  apelido: "Marina",
  papel: "user",
  numero_oab: "148502",
  uf_oab: "MG",
  importacao_automatica: false,
  subgrupos_destino: [],
  /* ⚠️ DOIS de propósito: é o caso em que o seletor de destino aparece. Com
     um só ele fica de fora, e um fixture de um subgrupo esconderia o
     controle da maior parte dos testes daqui. */
  subgrupos: [
    { id: "s-civel", nome: "Cível" },
    { id: "s-trab", nome: "Trabalhista" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lerMeuPerfil.mockResolvedValue(PERFIL);
  mocks.atualizarMeuPerfil.mockResolvedValue(PERFIL);
});

async function montar(perfil = PERFIL) {
  mocks.lerMeuPerfil.mockResolvedValue(perfil);
  renderComProviders(<FormularioDaInscricao />);
  return await screen.findByRole("textbox", { name: /Número da OAB/ });
}

const salvar = () => screen.getByRole("button", { name: /Salvar/ });
const numero = () => screen.getByRole("textbox", { name: /Número da OAB/ });

// ── 🔴 o motivo da consulta ───────────────────────────────────────────────

it("abre com a inscrição JÁ cadastrada, e não vazia", async () => {
  /* 🔴 É o defeito que o `GET /me` existe para evitar: sem a consulta, quem já
     tem OAB veria os campos em branco e cadastraria de novo. */
  await montar();
  expect(numero()).toHaveValue("148502");
  expect(screen.getByText("MG")).toBeInTheDocument();
});

it("abre vazia para quem não tem inscrição", async () => {
  await montar({ ...PERFIL, numero_oab: null, uf_oab: null });
  expect(numero()).toHaveValue("");
});

it("Salvar começa desligado -- nada mudou ainda", async () => {
  await montar();
  expect(salvar()).toBeDisabled();
});

// ── 🔴 a aba só manda o que é dela ────────────────────────────────────────

it("🔴 salvar a inscrição NÃO manda o nome junto", async () => {
  /* O servidor trata campo ausente como "não mexer", e mandar o apelido aqui o
     reescreveria. Desde as abas isso é ESTRUTURAL -- este componente nem
     conhece o campo do nome --, e o teste fixa a garantia. */
  await montar();
  await userEvent.clear(numero());
  await userEvent.type(numero(), "999");
  await userEvent.click(salvar());

  await waitFor(() => expect(mocks.atualizarMeuPerfil).toHaveBeenCalled());
  /* ⚠️ Igualdade EXATA, e é ela que prova a garantia: um `objectContaining`
     passaria mesmo com o apelido no corpo.

     `importacao` viaja junto desde a Fase 1b -- a aba salva as duas coisas de
     uma vez. O que continua ausente, e tem de continuar, é o nome. */
  expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
    inscricao: { numero: "999", uf: "MG" },
    importacao: { ligada: false, subgruposDestino: [] },
  });
});

it("não tem o campo do nome nem o do e-mail", async () => {
  await montar();
  expect(screen.queryByRole("textbox", { name: /Nome completo/ })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/E-mail/)).not.toBeInTheDocument();
});

// ── 🔴 limpar a inscrição ─────────────────────────────────────────────────

it("as duas partes vazias APAGAM a inscrição, e Salvar continua ligado", async () => {
  /* 🔴 É o único jeito de remover uma OAB cadastrada por engano. Se a
     validação exigisse o campo, esse estado seria inalcançável pela tela. */
  await montar();
  await userEvent.clear(numero());
  await userEvent.click(screen.getByLabelText(/UF/));
  await userEvent.click(await screen.findByRole("option", { name: "Nenhuma" }));

  expect(salvar()).toBeEnabled();
  await userEvent.click(salvar());
  await waitFor(() =>
    expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
      inscricao: { numero: "", uf: "" },
      importacao: { ligada: false, subgruposDestino: [] },
    }),
  );
});

// ── caminhos de erro ──────────────────────────────────────────────────────

it("número sem UF trava o Salvar e diz qual campo", async () => {
  await montar({ ...PERFIL, numero_oab: null, uf_oab: null });
  await userEvent.type(numero(), "148502");

  expect(await screen.findByText("Selecione a UF da OAB")).toBeInTheDocument();
  expect(salvar()).toBeDisabled();
});

it("número com letra trava o Salvar", async () => {
  await montar({ ...PERFIL, numero_oab: null, uf_oab: null });
  await userEvent.type(numero(), "abc");

  expect(await screen.findByText("O número da OAB tem só dígitos")).toBeInTheDocument();
  expect(salvar()).toBeDisabled();
});

it("mostra erro e oferece tentar de novo quando a consulta falha", async () => {
  /* ⚠️ Sem isto a aba abriria com os campos vazios depois de uma falha de
     rede -- indistinguível de "você não tem OAB", e um Salvar dali apagaria a
     inscrição de verdade. */
  mocks.lerMeuPerfil.mockRejectedValue(new Error("rede fora"));
  renderComProviders(<FormularioDaInscricao />);

  expect(await screen.findByText(/Não foi possível carregar a sua inscrição/)).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /Número da OAB/ })).not.toBeInTheDocument();
});

it("Cancelar devolve a inscrição que estava salva", async () => {
  await montar();
  await userEvent.clear(numero());
  await userEvent.type(numero(), "777");
  await userEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

  expect(numero()).toHaveValue("148502");
  expect(salvar()).toBeDisabled();
});

// ── 🔴 o interruptor da importação (Fase 1b) ──────────────────────────────

/* ⚠️ `checkbox`, e não `switch`: medido em 31/08/2026 -- o Chakra v3 rende o
   Switch como checkbox com nome acessível completo, e forçar `role="switch"`
   deixa o estado DESCONHECIDO, porque a ARIA exige `aria-checked` junto e o
   Chakra não o emite. Ver o comentário em `InterruptorDaImportacao`. */
const interruptor = () =>
  screen.getByRole("checkbox", { name: /Cadastrar automaticamente/ });

it("o interruptor NASCE com o valor salvo, e não desligado", async () => {
  /* ⚠️ Mesma armadilha dos campos de OAB: nascer desligado faria um "Salvar"
     sem querer desligar a importação de quem já tinha ligado. */
  await montar({ ...PERFIL, importacao_automatica: true, subgrupos_destino: ["s-civel"] });

  /* ⚠️ `waitFor`, e não asserção direta: o valor salvo chega por `useEffect`,
     DEPOIS do primeiro render. `montar` resolve assim que o formulário
     aparece, que pode ser antes de o efeito rodar -- os outros testes só
     passavam porque interagem antes de asseverar, e a interação descarrega o
     efeito. Sem isto o teste é intermitente, que é pior que vermelho. */
  await waitFor(() => expect(interruptor()).toBeChecked());
});

it("ligar manda o destino escolhido", async () => {
  await montar();
  await userEvent.click(interruptor());
  await userEvent.click(screen.getByLabelText(/Cadastrar em/));
  await userEvent.click(await screen.findByRole("option", { name: "Trabalhista" }));
  await userEvent.click(salvar());

  await waitFor(() =>
    expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
      inscricao: { numero: "148502", uf: "MG" },
      importacao: { ligada: true, subgruposDestino: ["s-trab"] },
    }),
  );
});

it("ligado sem escolher destino trava o Salvar", async () => {
  /* 🔴 É o único estado do formulário que o servidor recusa e a tela consegue
     prever. Deixar passar viraria um 400 que a pessoa leria como falha do
     sistema. */
  await montar();
  await userEvent.click(interruptor());

  expect(salvar()).toBeDisabled();
});

it("com UM subgrupo só, NÃO há seletor -- e o destino vai mesmo assim", async () => {
  /* ⚠️ O par que prova a decisão do usuário: seletor de uma opção é ruído,
     mas a regra continua valendo por baixo. Sem o destino implícito, "ligar"
     iria ao servidor sem destino e voltaria recusado. */
  await montar({ ...PERFIL, subgrupos: [{ id: "s-unico", nome: "Único" }] });
  await userEvent.click(interruptor());

  expect(screen.queryByLabelText(/Cadastrar em/)).not.toBeInTheDocument();
  await userEvent.click(salvar());

  await waitFor(() =>
    expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
      inscricao: { numero: "148502", uf: "MG" },
      importacao: { ligada: true, subgruposDestino: ["s-unico"] },
    }),
  );
});

it("SEM inscrição o interruptor fica travado, e diz por quê", async () => {
  /* 🔴 O servidor recusa ligar sem inscrição -- é o defeito que o `yarn
     offline` pegou do lado da API. A tela não deve deixar chegar lá. */
  await montar({ ...PERFIL, numero_oab: null, uf_oab: null });

  expect(interruptor()).toBeDisabled();
  expect(screen.getByText(/Cadastre sua inscrição acima/)).toBeInTheDocument();
});

it("digitar a inscrição LIBERA o interruptor antes de salvar", async () => {
  /* ⚠️ O par negativo do anterior: travar até a OAB estar GRAVADA obrigaria a
     salvar duas vezes para um pedido só. O servidor aceita as duas coisas no
     mesmo PATCH -- conferido em produção. */
  await montar({ ...PERFIL, numero_oab: null, uf_oab: null });
  await userEvent.type(numero(), "148502");
  await userEvent.click(screen.getByLabelText(/^UF/));
  await userEvent.click(await screen.findByRole("option", { name: "MG" }));

  expect(interruptor()).toBeEnabled();
});

it("sem subgrupo NENHUM o interruptor trava, com outro motivo", async () => {
  /* ⚠️ Dois motivos diferentes para o mesmo travamento, e a mensagem os
     separa: a inscrição a pessoa resolve ali mesmo; o subgrupo, não. */
  await montar({ ...PERFIL, subgrupos: [] });

  expect(interruptor()).toBeDisabled();
  expect(screen.getByText(/não participa de nenhum subgrupo/)).toBeInTheDocument();
});

it("DESLIGAR manda destino vazio", async () => {
  /* ⚠️ O servidor zera o destino ao desligar; mandar o antigo faria a tela e
     o banco discordarem sobre o que foi pedido. */
  await montar({ ...PERFIL, importacao_automatica: true, subgrupos_destino: ["s-civel"] });
  await userEvent.click(interruptor());
  await userEvent.click(salvar());

  await waitFor(() =>
    expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
      inscricao: { numero: "148502", uf: "MG" },
      importacao: { ligada: false, subgruposDestino: [] },
    }),
  );
});

it("Cancelar devolve o interruptor ao valor salvo", async () => {
  await montar({ ...PERFIL, importacao_automatica: true, subgrupos_destino: ["s-civel"] });
  await userEvent.click(interruptor());
  await userEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

  expect(interruptor()).toBeChecked();
  expect(salvar()).toBeDisabled();
});

// ── 🔴 as recusas de titularidade, que a API passou a devolver ────────────

it.each([
  ["O nome do seu perfil não confere com o titular desta inscrição na OAB"],
  ["Cadastre seu nome completo em Meus dados antes de vincular a inscrição -- ele precisa bater com o nome registrado no tribunal"],
  ["Inscrição não encontrada no tribunal: 263/MG. Confira o número e a UF -- ou esta inscrição ainda não tem movimentações publicadas"],
  ["Não foi possível verificar esta inscrição. Tente novamente em alguns minutos"],
])("mostra a recusa do servidor, e não uma frase genérica: %s", async (detalhe) => {
  /* 🔴 A API passou a recusar a inscrição por TITULARIDADE (31/08/2026), e
     cada recusa tem um conselho diferente: preencher o nome, conferir o
     número, ou tentar de novo. Trocar isso por "Não foi possível salvar"
     apagaria justamente a parte que diz o que fazer.

     ⚠️ E a primeira delas vai acontecer com TODO MUNDO: medido em produção,
     os cinco nomes cadastrados têm uma palavra só.
  */
  const { ApiError } = await import("../../../../services/api/client");
  mocks.atualizarMeuPerfil.mockRejectedValue(new ApiError(detalhe, 400, { detail: detalhe }));

  await montar({ ...PERFIL, numero_oab: null, uf_oab: null });
  await userEvent.type(numero(), "263");
  await userEvent.click(screen.getByLabelText(/^UF/));
  await userEvent.click(await screen.findByRole("option", { name: "MG" }));
  await userEvent.click(salvar());

  expect(await screen.findByText(detalhe)).toBeInTheDocument();
});
