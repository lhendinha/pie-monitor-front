import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

/** Revela o endereço atual -- a aba mora nele, e "Abrir processo" navega. */
function Espiao() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{`${pathname}${search}`}</div>;
}

function montar(rota = "/clientes/c1") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/clientes" element={<div>lista de clientes</div>} />
        <Route path="/clientes/:clienteId" element={<ClienteDetalhePage />} />
        <Route
          path="/processos/:subgrupoId/:numero"
          element={<div>tela do processo</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

/** O painel que a aba de nome `nome` comanda -- ver o gêmeo em
 * `ProcessoDetalhePage`: painel escondido tem nome acessível vazio, então
 * `getByRole("tabpanel", { name })` não acha os inativos. */
function painel(nome: string) {
  const aba = screen.getByRole("tab", { name: nome });
  const alvo = document.getElementById(aba.getAttribute("aria-controls") ?? "");
  if (!alvo) throw new Error(`A aba "${nome}" aponta pra um painel que não existe.`);
  return alvo;
}

/** Entra na aba dos processos. Os testes da lista precisam dela ABERTA:
 * o painel fica montado, então `findByText` acharia o conteúdo escondido e
 * passaria mesmo com as abas quebradas. */
async function irParaProcessos() {
  await userEvent.click(
    await screen.findByRole("tab", { name: "Processos vinculados" }),
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
    await irParaProcessos();

    expect(await screen.findByText("0000266-87.2021.8.13.0559")).toBeVisible();
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
    await irParaProcessos();

    expect(await screen.findByText("Nenhum processo vinculado a este cliente.")).toBeVisible();
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
    await irParaProcessos();

    expect(
      await screen.findByText(/Não foi possível carregar os processos deste cliente/),
    ).toBeVisible();
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

const PROCESSO = {
  subgrupo_id: "sg1",
  numero_processo: "00002668720218130559",
  apelido: "Obra da Alfa",
  fase_id: "fase-1",
  situacao_id: "sit-1",
  prazo_final: "2026-09-15",
};

/** As duas abas.
 *
 * 🔴 `toBeVisible`, e não `toBeInTheDocument`: os dois painéis vão MONTADOS
 * (o de Detalhes é formulário com estado local; a lista de processos é o que
 * trava a exclusão), e painel escondido continua no documento. Os testes que
 * já existiam liam as duas abas ao mesmo tempo e passariam com as abas
 * completamente quebradas.
 */
describe("as duas abas", () => {
  it("abre em Detalhes, com o painel de processos escondido", async () => {
    montar();

    expect(await screen.findByLabelText(/Nome/)).toBeVisible();
    expect(painel("Detalhes")).toBeVisible();
    expect(painel("Processos vinculados")).not.toBeVisible();
  });

  it("trocar de aba escreve na URL", async () => {
    montar();
    await irParaProcessos();

    expect(url()).toContain("aba=processos");
    expect(painel("Processos vinculados")).toBeVisible();
    expect(painel("Detalhes")).not.toBeVisible();
  });

  it("a aba da URL é a que abre -- um F5 não devolve pra primeira", async () => {
    montar("/clientes/c1?aba=processos");

    expect(await screen.findByText("Nenhum processo vinculado a este cliente.")).toBeVisible();
    expect(painel("Detalhes")).not.toBeVisible();
  });

  it("aba inventada na URL cai na primeira, e não numa tela em branco", async () => {
    montar("/clientes/c1?aba=inventada");

    expect(await screen.findByLabelText(/Nome/)).toBeVisible();
    expect(painel("Detalhes")).toBeVisible();
  });

  it("o que foi digitado sobrevive à ida e volta entre abas", async () => {
    // É a razão de os painéis irem montados.
    montar();

    const nome = await screen.findByLabelText(/Nome/);
    await userEvent.clear(nome);
    await userEvent.type(nome, "Construtora Beta");

    await irParaProcessos();
    await userEvent.click(screen.getByRole("tab", { name: "Detalhes" }));

    expect(await screen.findByLabelText(/Nome/)).toHaveValue("Construtora Beta");
  });
});

describe("o resumo do processo vinculado", () => {
  beforeEach(() => {
    mocks.listarProcessos.mockResolvedValue({
      processos: [PROCESSO],
      total: 1,
      total_paginas: 1,
    });
    mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
      Promise.resolve({
        opcoes:
          tipo === "fase"
            ? [{ opcao_id: "fase-1", tipo: "fase", rotulo: "Conhecimento", ordem: 1, ativo: true }]
            : [{ opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true }],
      }),
    );
  });

  it("clicar na linha abre o resumo com número, apelido, situação, fase e prazo", async () => {
    // Antes a lista era texto morto: chegar num daqueles processos exigia
    // copiar o número, sair pra listagem e colar na busca.
    montar();
    await irParaProcessos();

    await userEvent.click(await screen.findByRole("button", { name: /Obra da Alfa/ }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText("Obra da Alfa")).toBeVisible();
    expect(within(modal).getByText("0000266-87.2021.8.13.0559")).toBeVisible();
    expect(within(modal).getByText("Aguardando sentença")).toBeVisible();
    expect(within(modal).getByText("Conhecimento")).toBeVisible();
    expect(within(modal).getByText("15/09/2026")).toBeVisible();
  });

  it("'Abrir processo' leva pra tela do processo, no subgrupo certo", async () => {
    montar();
    await irParaProcessos();
    await userEvent.click(await screen.findByRole("button", { name: /Obra da Alfa/ }));

    await userEvent.click(await screen.findByRole("button", { name: "Abrir processo" }));

    expect(await screen.findByText("tela do processo")).toBeVisible();
    expect(url()).toBe("/processos/sg1/00002668720218130559");
  });

  it("processo sem prazo mostra travessão, e não um campo que some", async () => {
    /* Campo vazio sumindo faz parecer que a informação não existe no
       sistema, quando o que houve foi ninguém ter preenchido. */
    mocks.listarProcessos.mockResolvedValue({
      processos: [{ ...PROCESSO, prazo_final: null }],
      total: 1,
      total_paginas: 1,
    });
    montar();
    await irParaProcessos();
    await userEvent.click(await screen.findByRole("button", { name: /Obra da Alfa/ }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText("Prazo final")).toBeVisible();
    expect(within(modal).getByText("—")).toBeVisible();
  });
});

