import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarClientes: vi.fn(async () => ({
    clientes: [{ cliente_id: "c1", nome: "Construtora Alfa", grupo_id: "g1" }],
    total: 1,
  })),
  criarCliente: vi.fn(async (_campos: { nome: string }) => ({
    cliente_id: "c-novo",
    nome: "SONIA MARIA ALVES",
  })),
  papelAtende: vi.fn(() => true),
}));

vi.mock("../../services", () => mocks);

import CampoDeClientes from "./index";

/** O campo de clientes dos formulários de processo e atendimento.
 *
 * 🔴 O atalho de cadastrar existe porque o caso é o de todo dia: a pessoa
 * digita um nome que não está no cadastro, e sair para a tela de Clientes
 * significaria perder o formulário que ela está preenchendo.
 */
function montar(valor: string[] = []) {
  const onMudar = vi.fn();
  renderComProviders(
    <CampoDeClientes
      id="clientes"
      valor={valor}
      nomes={new Map(valor.map((v) => [v, "Construtora Alfa"]))}
      onMudar={onMudar}
    />,
  );
  return onMudar;
}

const campo = () => screen.getByRole("combobox");
const atalho = () => screen.queryByRole("button", { name: /Novo cliente/ });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
});

describe("cadastrar cliente sem sair do formulário", () => {
  it("🔴 oferece cadastrar o nome digitado quando ele não existe", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(campo());
    await usuario.type(campo(), "SONIA MARIA ALVES");

    expect(await screen.findByRole("button", { name: /Novo cliente/ })).toHaveTextContent(
      "SONIA MARIA ALVES",
    );
  });

  it("⚠️ NÃO oferece quando o nome já está no cadastro", async () => {
    /* O par que impede o atalho virar fábrica de duplicata: digitou o nome
       de quem já existe, a resposta certa é a opção da lista. */
    const usuario = userEvent.setup();
    montar();

    await usuario.click(campo());
    await usuario.type(campo(), "Construtora Alfa");

    await waitFor(() => expect(mocks.listarClientes).toHaveBeenCalled());
    expect(atalho()).not.toBeInTheDocument();
  });

  it("não oferece com o campo em branco", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(campo());

    await waitFor(() => expect(mocks.listarClientes).toHaveBeenCalled());
    expect(atalho()).not.toBeInTheDocument();
  });

  it("🔴 quem não é `manager` não vê o atalho -- a API recusaria", async () => {
    /* Mesma régua de `podeRemoverResponsavel`: não oferecer o que a rota vai
       negar. Um controle que existe e devolve 400 é pior que um ausente. */
    mocks.papelAtende.mockReturnValue(false);
    const usuario = userEvent.setup();
    montar();

    await usuario.click(campo());
    await usuario.type(campo(), "Nome Novo");

    await waitFor(() => expect(mocks.listarClientes).toHaveBeenCalled());
    expect(atalho()).not.toBeInTheDocument();
  });

  it("cadastra e já deixa ESCOLHIDO", async () => {
    /* Quem cadastrou dali estava escolhendo -- obrigar a procurar de novo o
       que acabou de criar é trabalho à toa. */
    const usuario = userEvent.setup();
    const onMudar = montar();

    await usuario.click(campo());
    await usuario.type(campo(), "SONIA MARIA ALVES");
    await usuario.click(await screen.findByRole("button", { name: /Novo cliente/ }));

    await waitFor(() =>
      expect(mocks.criarCliente).toHaveBeenCalledWith({ nome: "SONIA MARIA ALVES" }),
    );
    const [ids, nomes] = onMudar.mock.calls[onMudar.mock.calls.length - 1];
    expect(ids).toEqual(["c-novo"]);
    expect(nomes.get("c-novo")).toBe("SONIA MARIA ALVES");
  });

  it("manda só o NOME -- o resto do cadastro fica para a tela do cliente", async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(campo());
    await usuario.type(campo(), "Nome Novo");
    await usuario.click(await screen.findByRole("button", { name: /Novo cliente/ }));

    await waitFor(() => expect(mocks.criarCliente).toHaveBeenCalled());
    expect(Object.keys(mocks.criarCliente.mock.calls[0][0])).toEqual(["nome"]);
  });
});
