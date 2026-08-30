import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

import { SessaoProvider } from "../../../../contexts/SessaoContext";
import { renderComProviders } from "../../../../test/queryTestUtils";

/* ⚠️ O mock precisa cobrir o que `useSessao` consome, e não só o que o
   formulário chama: `vi.mock` substitui o módulo INTEIRO, então uma função
   que falta vira `undefined` e o provider quebra por infraestrutura -- longe
   do que o teste queria verificar. */
const mocks = vi.hoisted(() => ({
  lerMeuPerfil: vi.fn(),
  atualizarMeuPerfil: vi.fn(),
  getEmail: vi.fn(() => "marina@escritorio.test"),
  getApelido: vi.fn(() => "Marina"),
  salvarApelido: vi.fn(),
  estaAutenticado: vi.fn(() => true),
  limparTokens: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import FormularioIdentificacao from "./index";
import type { MeuPerfil } from "../../../../types";

/* ⚠️ Anotado como `MeuPerfil`, e não inferido: sem a anotação o TypeScript
   deduz `numero_oab: string` do valor de exemplo, e os testes de "quem não
   tem inscrição" não compilam. O `vitest` não checa tipo -- quem pegou foi o
   `yarn build`. */
const PERFIL: MeuPerfil = {
  email: "marina@escritorio.test",
  apelido: "Marina",
  papel: "user" as const,
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
  renderComProviders(
    <SessaoProvider>
      <FormularioIdentificacao onAlterarSenha={() => {}} />
    </SessaoProvider>,
  );
  return await screen.findByLabelText(/Número/);
}

const salvar = () => screen.getByRole("button", { name: /Salvar/ });
const numero = () => screen.getByLabelText(/Número/);

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

// ── o que vai no PATCH ────────────────────────────────────────────────────

it("Salvar começa desligado -- nada mudou ainda", async () => {
  await montar();
  expect(salvar()).toBeDisabled();
});

it("🔴 trocar a OAB NÃO manda o apelido junto", async () => {
  /* O servidor trata campo ausente como "não mexer", e mandar o apelido numa
     troca de OAB o reescreveria. Foi por essa razão que `apelido` virou
     opcional no schema de lá -- o front tem de fazer a parte dele. */
  await montar();
  await userEvent.clear(numero());
  await userEvent.type(numero(), "999");
  await userEvent.click(salvar());

  await waitFor(() => expect(mocks.atualizarMeuPerfil).toHaveBeenCalled());
  expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({
    inscricao: { numero: "999", uf: "MG" },
  });
});

it("🔴 trocar o apelido NÃO manda a inscrição junto", async () => {
  /* O par do teste acima. Sem ele, salvar o nome reescreveria a OAB -- e se
     duas abas estivessem abertas, a mais antiga venceria. */
  await montar();
  const apelido = screen.getByLabelText(/Apelido/);
  await userEvent.clear(apelido);
  await userEvent.type(apelido, "Marina Duarte");
  await userEvent.click(salvar());

  await waitFor(() => expect(mocks.atualizarMeuPerfil).toHaveBeenCalled());
  expect(mocks.atualizarMeuPerfil).toHaveBeenCalledWith({ apelido: "Marina Duarte" });
});

// ── 🔴 limpar a inscrição ─────────────────────────────────────────────────

it("as duas partes vazias APAGAM a inscrição, e Salvar continua ligado", async () => {
  /* 🔴 É o único jeito de remover uma OAB cadastrada por engano. Se a
     validação exigisse o campo, esse estado seria inalcançável pela tela. */
  await montar();
  await userEvent.clear(numero());
  await userEvent.click(screen.getByLabelText(/UF/));
  await userEvent.click(await screen.findByText("Nenhuma"));

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

it("apelido vazio trava o Salvar, mesmo com a OAB válida", async () => {
  /* ⚠️ O apelido continua obrigatório. Uma inscrição válida não pode
     autorizar um PATCH que apagaria o nome. */
  await montar();
  await userEvent.clear(screen.getByLabelText(/Apelido/));
  expect(salvar()).toBeDisabled();
});

it("mostra erro e oferece tentar de novo quando a consulta falha", async () => {
  /* ⚠️ Sem isto a tela abriria com os campos vazios depois de uma falha de
     rede -- indistinguível de "você não tem OAB", e um Salvar dali apagaria a
     inscrição de verdade. */
  mocks.lerMeuPerfil.mockRejectedValue(new Error("rede fora"));
  renderComProviders(
    <SessaoProvider>
      <FormularioIdentificacao onAlterarSenha={() => {}} />
    </SessaoProvider>,
  );

  expect(await screen.findByText(/Não foi possível carregar o seu perfil/)).toBeInTheDocument();
  expect(screen.queryByLabelText(/Número/)).not.toBeInTheDocument();
});

it("Cancelar devolve a inscrição que estava salva", async () => {
  await montar();
  await userEvent.clear(numero());
  await userEvent.type(numero(), "777");
  await userEvent.click(screen.getByRole("button", { name: /Cancelar/ }));

  expect(numero()).toHaveValue("148502");
  expect(salvar()).toBeDisabled();
});
