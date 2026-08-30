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
  expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
    inscricao: { numero: "999", uf: "MG" },
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
