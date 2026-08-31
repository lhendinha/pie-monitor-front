import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "../../../../services/api/client";
import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  lerConfiguracoesDoGrupo: vi.fn(),
  atualizarConfiguracoesDoGrupo: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import ConfiguracoesDoGrupo from "./index";

const CONFIG = {
  nome: "Silva Advogados",
  dias_para_arquivar: 7,
  dias_para_arquivar_minimo: 1,
  dias_para_arquivar_maximo: 365,
  dias_para_arquivar_padrao: 7,
  nome_tamanho_maximo: 120,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.lerConfiguracoesDoGrupo.mockResolvedValue(CONFIG);
  mocks.atualizarConfiguracoesDoGrupo.mockResolvedValue(CONFIG);
});

async function montar() {
  renderComProviders(<ConfiguracoesDoGrupo />);
  return await screen.findByLabelText(/Nome do grupo/);
}

const salvarBtn = () => screen.getByRole("button", { name: /Salvar/ });

it("abre com o que está salvo, não vazio", async () => {
  const nome = await montar();
  expect(nome).toHaveValue("Silva Advogados");
  expect(screen.getByLabelText(/Arquivar concluídas/)).toHaveValue(7);
});

it("Salvar começa desligado -- nada mudou ainda", async () => {
  await montar();
  expect(salvarBtn()).toBeDisabled();
});

it("manda SÓ o nome quando só o nome mudou", async () => {
  const nome = await montar();
  await userEvent.clear(nome);
  await userEvent.type(nome, "Silva e Souza");
  await userEvent.click(salvarBtn());

  await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  // Sem `dias_para_arquivar`: reenviá-lo faria este Salvar sobrescrever um
  // prazo que outra pessoa acabou de alterar.
  expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalledWith({ nome: "Silva e Souza" });
});

it("manda SÓ o prazo quando só o prazo mudou", async () => {
  await montar();
  const dias = screen.getByLabelText(/Arquivar concluídas/);
  await userEvent.clear(dias);
  await userEvent.type(dias, "30");
  await userEvent.click(salvarBtn());

  await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalledWith({ dias_para_arquivar: 30 });
});

it("manda os dois quando os dois mudaram", async () => {
  const nome = await montar();
  await userEvent.clear(nome);
  await userEvent.type(nome, "Outro Nome");
  const dias = screen.getByLabelText(/Arquivar concluídas/);
  await userEvent.clear(dias);
  await userEvent.type(dias, "10");
  await userEvent.click(salvarBtn());

  await waitFor(() => expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalled());
  expect(mocks.atualizarConfiguracoesDoGrupo).toHaveBeenCalledWith({
    nome: "Outro Nome",
    dias_para_arquivar: 10,
  });
});

it("nome vazio bloqueia o Salvar", async () => {
  const nome = await montar();
  await userEvent.clear(nome);
  expect(salvarBtn()).toBeDisabled();
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});

it("só espaço em branco não passa por nome preenchido", async () => {
  const nome = await montar();
  await userEvent.clear(nome);
  await userEvent.type(nome, "   ");
  expect(salvarBtn()).toBeDisabled();
});

it("espaço nas pontas não conta como mudança", async () => {
  const nome = await montar();
  await userEvent.type(nome, "  ");
  // O servidor faz `strip`; mandar isso gravaria o mesmo nome e um toast de
  // sucesso pra uma alteração que não existiu.
  expect(salvarBtn()).toBeDisabled();
});

it("prazo fora do limite bloqueia o Salvar", async () => {
  await montar();
  const dias = screen.getByLabelText(/Arquivar concluídas/);
  await userEvent.clear(dias);
  await userEvent.type(dias, "400");
  expect(salvarBtn()).toBeDisabled();
});

it("avisa que o nome é único antes de a pessoa tentar", async () => {
  await montar();
  expect(screen.getByText(/Não pode repetir o nome de outro grupo/)).toBeInTheDocument();
});

it("mostra erro quando a leitura falha, com botão de tentar de novo", async () => {
  mocks.lerConfiguracoesDoGrupo.mockRejectedValue(new Error("falhou"));
  renderComProviders(<ConfiguracoesDoGrupo />);
  expect(await screen.findByRole("button", { name: /Tentar de novo/ }, { timeout: 5000 })).toBeInTheDocument();
});

it("mostra a mensagem do SERVIDOR quando o nome já existe", async () => {
  /* A colisão é com grupo de outro cliente -- a tela não tem como prever, e
   * uma mensagem genérica ("Não foi possível salvar") deixaria a pessoa sem
   * saber que basta escolher outro nome. */
  mocks.atualizarConfiguracoesDoGrupo.mockRejectedValue(
    new ApiError("Já existe um grupo com esse nome", 409),
  );

  const nome = await montar();
  await userEvent.clear(nome);
  await userEvent.type(nome, "Nome Tomado");
  await userEvent.click(salvarBtn());

  expect(await screen.findByText("Já existe um grupo com esse nome")).toBeInTheDocument();
});

it("o campo de dias NÃO repete o número ao lado", async () => {
  /* 🔴 A tela mostrava "[8] 8 dias": o campo já traz o número, e `contar`
     escrevia de novo ao lado -- o olho lê o mesmo dado duas vezes.

     ⚠️ O par que impede a "correção" preguiçosa (apagar o texto todo) está em
     `utils/plural.test.ts`: a palavra continua, concordando -- com 1 é "dia". */
  await montar();
  const campo = screen.getByLabelText(/Arquivar concluídas depois de/);
  const linha = campo.parentElement!;

  expect(linha).toHaveTextContent(/\bdias\b/);
  expect(linha.textContent?.match(/7/g) ?? []).toHaveLength(0);
});
