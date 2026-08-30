import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { SessaoProvider } from "../../../../contexts/SessaoContext";
import { renderComProviders } from "../../../../test/queryTestUtils";

/* ⚠️ O mock precisa cobrir o que `useSessao` consome, e não só o que o
   formulário chama: `vi.mock` substitui o módulo INTEIRO, então uma função que
   falta vira `undefined` e o provider quebra por infraestrutura -- longe do
   que o teste queria verificar. */
const mocks = vi.hoisted(() => ({
  atualizarMeuPerfil: vi.fn(),
  getEmail: vi.fn(() => "marina@escritorio.test"),
  getApelido: vi.fn(() => "Marina"),
  salvarApelido: vi.fn(),
  estaAutenticado: vi.fn(() => true),
  limparTokens: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import FormularioDeDados from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.atualizarMeuPerfil.mockResolvedValue({});
  mocks.getEmail.mockReturnValue("marina@escritorio.test");
  mocks.getApelido.mockReturnValue("Marina");
});

async function montar() {
  renderComProviders(
    <SessaoProvider>
      <FormularioDeDados onAlterarSenha={() => {}} />
    </SessaoProvider>,
  );
  return await screen.findByRole("textbox", { name: /Nome completo/ });
}

const salvar = () => screen.getByRole("button", { name: /Salvar/ });
const nome = () => screen.getByRole("textbox", { name: /Nome completo/ });

// ── o rótulo e a dica ─────────────────────────────────────────────────────

it('o campo se chama "Nome completo", e não "Apelido"', async () => {
  /* 🔴 Só o RÓTULO muda -- atrás continua o mesmo campo `apelido`, sem
     migração. O nome novo vale onde a PESSOA lê, mesma régua de
     `pje-monitor` vs Argos. */
  await montar();
  expect(nome()).toBeInTheDocument();
  expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
});

it('o "i" abre a explicação e NÃO envia o formulário', async () => {
  /* 🔴 O gatilho é `BotaoNu` com `type="button"`. Sem isso, um botão dentro de
     `<form>` é submit por padrão do HTML -- clicar no "i" salvaria o perfil. O
     docstring de `BotaoNu` conta que isso já mordeu três vezes. */
  await montar();
  await userEvent.click(
    screen.getByRole("button", { name: /Por que o nome completo importa/ }),
  );

  expect(await screen.findByText(/comparar com o nome que o tribunal devolve/)).toBeInTheDocument();
  expect(mocks.atualizarMeuPerfil).not.toHaveBeenCalled();
});

// ── 🔴 a aba só manda o que é dela ────────────────────────────────────────

it("🔴 salvar o nome NÃO manda a inscrição junto", async () => {
  /* Desde as abas isso é ESTRUTURAL -- este componente nem conhece os campos
     da OAB --, e o teste fixa a garantia. Sem ela, salvar o nome reescreveria
     a inscrição, e com duas abas abertas a mais antiga venceria. */
  await montar();
  await userEvent.clear(nome());
  await userEvent.type(nome(), "Marina Duarte");
  await userEvent.click(salvar());

  await waitFor(() => expect(mocks.atualizarMeuPerfil).toHaveBeenCalled());
  expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({ apelido: "Marina Duarte" });
});

it("não tem os campos da OAB", async () => {
  await montar();
  expect(screen.queryByRole("textbox", { name: /Número da OAB/ })).not.toBeInTheDocument();
});

// ── a conta ───────────────────────────────────────────────────────────────

it("mostra o e-mail num campo travado, com o Alterar senha ao lado", async () => {
  await montar();
  const email = screen.getByLabelText(/E-mail/);
  expect(email).toBeDisabled();
  expect(email).toHaveValue("marina@escritorio.test");
  expect(screen.getByRole("button", { name: /Alterar senha/ })).toBeInTheDocument();
});

it("🔴 o Alterar senha NÃO envia o formulário", async () => {
  /* Mesma armadilha do "i": é um botão dentro de `<form>`, e sem
     `type="button"` viraria submit. */
  await montar();
  await userEvent.click(screen.getByRole("button", { name: /Alterar senha/ }));
  expect(mocks.atualizarMeuPerfil).not.toHaveBeenCalled();
});

// ── caminhos de erro ──────────────────────────────────────────────────────

it("Salvar começa desligado e trava com o nome vazio", async () => {
  await montar();
  expect(salvar()).toBeDisabled();
  await userEvent.clear(nome());
  expect(salvar()).toBeDisabled();
});

it("Cancelar devolve o nome que estava salvo", async () => {
  await montar();
  await userEvent.clear(nome());
  await userEvent.type(nome(), "Outro");
  await userEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

  expect(nome()).toHaveValue("Marina");
  expect(salvar()).toBeDisabled();
});
