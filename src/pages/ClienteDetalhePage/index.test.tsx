import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalheCliente: vi.fn(),
  atualizarCliente: vi.fn(),
  removerCliente: vi.fn(),
  listarProcessos: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import ClienteDetalhePage from "./index";

const CLIENTE = {
  cliente_id: "c1",
  nome: "Construtora Alfa",
  cpf_cnpj: "12345678000195",
  telefone: "31988887777",
  email: "contato@alfa.test",
  processos: 2,
};

function montar() {
  return renderComProviders(
    <MemoryRouter initialEntries={["/clientes/c1"]}>
      <Routes>
        <Route path="/clientes" element={<div>lista de clientes</div>} />
        <Route path="/clientes/:clienteId" element={<ClienteDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.detalheCliente.mockResolvedValue(CLIENTE);
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarOpcoesProcesso.mockResolvedValue({ opcoes: [] });
});

describe("ClienteDetalhePage", () => {
  it("carrega o cliente pela URL -- sem depender da listagem", async () => {
    montar();

    expect(await screen.findByLabelText(/Nome/)).toHaveValue("Construtora Alfa");
    expect(mocks.detalheCliente).toHaveBeenCalledWith("c1");
  });

  it("reaplica as máscaras de documento e telefone ao abrir", async () => {
    // O backend guarda só dígitos; a máscara é exibição, e tem que voltar
    // quando o cliente é aberto pra edição.
    montar();

    expect(await screen.findByLabelText(/CPF\/CNPJ/)).toHaveValue("12.345.678/0001-95");
    expect(screen.getByLabelText(/Telefone/)).toHaveValue("(31) 98888-7777");
  });

  it("salvar envia só dígitos", async () => {
    mocks.atualizarCliente.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    const nome = await screen.findByLabelText(/Nome/);
    await user.clear(nome);
    await user.type(nome, "Construtora Beta");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarCliente).toHaveBeenCalledWith("c1", {
        nome: "Construtora Beta",
        cpfCnpj: "12345678000195",
        telefone: "31988887777",
        email: "contato@alfa.test",
      }),
    );
  });

  it("e-mail malformado bloqueia o salvar", async () => {
    const user = userEvent.setup();
    montar();

    const email = await screen.findByLabelText(/E-mail/);
    await user.clear(email);
    await user.type(email, "quebrado@");

    expect(await screen.findByText("E-mail inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("excluir pede confirmação no diálogo do sistema e volta pra listagem", async () => {
    // `window.confirm` não serve: é do navegador, não dá pra pôr o nome do
    // cliente em destaque nem avisar sobre os processos vinculados, e em
    // alguns navegadores dá pra silenciá-lo.
    mocks.removerCliente.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerCliente).toHaveBeenCalledWith("c1"));
    expect(await screen.findByText("lista de clientes")).toBeInTheDocument();
  });

  it("🔴 o diálogo diz que a exclusão está BLOQUEADA, não que os processos perdem o cliente", async () => {
    /* O texto antigo descrevia o desfecho de DESVINCULAR, que só vale pra
     * atendimento. Pra processo o servidor sempre recusa (409 `ClienteEmUso`),
     * então a pessoa confirmava esperando uma coisa e recebia um erro. */
    mocks.listarProcessos.mockResolvedValue({
      processos: [
        { subgrupo_id: "sg1", numero_processo: "00002668720218130559", apelido: "x" },
      ],
    });
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(await screen.findByText(/está vinculado a 1 processo/)).toBeInTheDocument();

    /* 🔴 E o botão de confirmar NÃO existe.
     *
     * A versão anterior mostrava o impedimento no `aviso` de um
     * `ModalDeConfirmacao`, cujo "Excluir" continuava ativo: confirmar
     * disparava um DELETE que o servidor recusa com 409. O teste antigo
     * conferia só o TEXTO, então passava com o botão ativo -- prometer
     * impossibilidade e deixar o caminho aberto é pior que não avisar.
     *
     * `SubgruposPage` já usava `ModalDeAviso` (sem botão) pro mesmo caso. */
    /* ⚠️ Escopado ao DIÁLOGO: o "Excluir" do cabeçalho da página continua
     * existindo -- é ele que abre este modal. Procurar na tela inteira
     * encontraria aquele e o teste passaria sem provar nada. */
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).queryByRole("button", { name: /^Excluir$/ })).not.toBeInTheDocument();
    expect(within(dialogo).getByRole("button", { name: "Entendi" })).toBeInTheDocument();
  });

  it("cliente em uso por processo mostra a mensagem que a API deu", async () => {
    // O backend bloqueia (`ClienteEmUso`) pra não deixar `cliente_id` solto
    // apontando pra nada. A tela repassa o motivo, não inventa outro.
    mocks.removerCliente.mockRejectedValue(
      new ApiError("Cliente ainda vinculado a um processo", 409),
    );
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Cliente ainda vinculado a um processo")).toBeInTheDocument();
  });

  it("sem permissão de admin, não mostra o botão de excluir", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montar();
    await screen.findByLabelText(/Nome/);

    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("lista os processos vinculados", async () => {
    mocks.listarProcessos.mockResolvedValue({
      processos: [{ subgrupo_id: "sg1", numero_processo: "00002668720218130559", apelido: "" }],
      total: 1,
      total_paginas: 1,
    });
    montar();

    expect(await screen.findByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
    expect(mocks.listarProcessos).toHaveBeenCalledWith(
      expect.objectContaining({ clienteId: "c1" }),
    );
  });

  it("🔴 busca TODAS as páginas -- o ramo filtrado da API tem default 10", async () => {
    /* Era `listarProcessos({ clienteId })` sem `tamanhoPagina`, e o ramo
     * FILTRADO do `processos_router` tem default 10 (`Query(10, ge=1,
     * le=100)`) -- não 100 como os outros catálogos. Um cliente com 25
     * processos mostrava 10 no cartão, sem paginação, e o diálogo de
     * exclusão dizia "está vinculado a 10 processos".
     *
     * O diálogo é o pior lado: existe pra dizer o que impede a exclusão, e
     * dizia um número menor que o real -- quem desvinculasse os 10
     * informados tomaria 409 de novo, sem entender. */
    const pagina = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        subgrupo_id: "sg1",
        numero_processo: String(i).padStart(20, "0"),
        apelido: `Caso ${i}`,
      }));
    /* ⚠️ `mockImplementation` por PÁGINA, não `mockResolvedValueOnce`.
     *
     * A query executa mais de uma vez (montagem do cartão e do diálogo
     * compartilham a chave, mas não necessariamente o mesmo ciclo), e os
     * valores `Once` acabavam -- a execução seguinte caía no mock base
     * `{ processos: [] }` e o resultado final era zero. */
    mocks.listarProcessos.mockImplementation(
      ({ pagina: p }: { pagina?: number } = {}) =>
        Promise.resolve({
          processos: p === 2 ? pagina(25) : pagina(100),
          total: 125,
          total_paginas: 2,
        }),
    );

    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    /* ⚠️ Reconsulta o diálogo DENTRO do `waitFor`.
     *
     * A frase é quebrada por `<strong>`, então precisa de `toHaveTextContent`
     * -- mas guardar o elemento antes fazia a asserção olhar um nó já
     * desmontado: enquanto os dados não chegam, `processosLigados` é 0 e o
     * diálogo mostrado é o de CONFIRMAÇÃO; quando chegam, ele é trocado
     * pelo de bloqueio. A referência velha nunca muda de conteúdo. */
    await waitFor(() =>
      expect(screen.getByRole("dialog")).toHaveTextContent(/125 processos/),
    );
    // Pediu a 2ª página -- é isso que a versão truncada não fazia.
    expect(
      mocks.listarProcessos.mock.calls.some(
        (c) => (c[0] as { pagina?: number })?.pagina === 2,
      ),
    ).toBe(true);
  });

  it("sem processo vinculado, diz isso", async () => {
    montar();

    expect(
      await screen.findByText("Nenhum processo vinculado a este cliente."),
    ).toBeInTheDocument();
  });

  it("'Voltar' devolve pra listagem", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: /Voltar/ }));

    expect(await screen.findByText("lista de clientes")).toBeInTheDocument();
  });

  it("🔴 erro ao carregar NÃO vira 'nenhum processo vinculado'", async () => {
    /* `query.data || []` fazia o cartão AFIRMAR que o cliente não tem
     * processo nenhum quando a busca falhou. O toast some em 4,5s; a
     * afirmação falsa fica. O irmão desta mesma leva -- `TarefasVinculadas`
     * -- já tratava assim, com o mesmo raciocínio escrito. */
    mocks.listarProcessos.mockRejectedValue(new Error("rede"));
    montar();

    expect(
      await screen.findByText(/Não foi possível carregar os processos deste cliente/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Nenhum processo vinculado a este cliente."),
    ).not.toBeInTheDocument();
  });

  it("🔴 abrir o diálogo REBUSCA a contagem em vez de usar a do cache", async () => {
    /* A query fica montada (o cartão a usa), então abrir o diálogo não
     * disparava busca nenhuma: ele decidia com o que estivesse no cache.
     * Contagem velha e não-zero bloqueia uma exclusão legítima -- e o
     * diálogo de aviso nem tem botão pra insistir. */
    mocks.listarProcessos.mockResolvedValue({ processos: [], total: 0, total_paginas: 1 });
    const user = userEvent.setup();
    montar();
    await screen.findByText("Nenhum processo vinculado a este cliente.");

    const antes = mocks.listarProcessos.mock.calls.length;
    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(mocks.listarProcessos.mock.calls.length).toBeGreaterThan(antes),
    );
  });
});
