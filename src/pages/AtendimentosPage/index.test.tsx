import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarAtendimentos: vi.fn(),
  listarClientes: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
  listarProcessos: vi.fn(),
  criarAtendimento: vi.fn(),
  papelAtende: vi.fn(),
}));
const navegou = vi.hoisted(() => vi.fn());

vi.mock("../../services", () => mocks);
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navegou,
}));

import AtendimentosPage from "./index";

function atendimento(parcial: Record<string, unknown> = {}) {
  return {
    subgrupo_id: "s1",
    atendimento_id: "a1",
    assunto: "Revisão de contrato",
    status: "Em andamento",
    criado_em: "2026-08-10T09:00:00+00:00",
    cliente_ids: ["c1"],
    cliente_nomes: ["Maria Souza"],
    /* Data do registro DIFERENTE da criação de propósito: a linha mostra as
       duas (criação à esquerda, último registro à direita), e com a mesma
       data não dá pra distinguir qual está sendo verificada. */
    registros: [
      { autor_id: "ana@x.com", autor_nome: "Ana Paula", registrado_em: "2026-08-12T09:00:00+00:00", texto: "Primeiro contato" },
    ],
    ...parcial,
  };
}

function comLista(lista: Record<string, unknown>[], total = lista.length) {
  mocks.listarAtendimentos.mockResolvedValue({
    atendimentos: lista,
    total,
    total_paginas: Math.max(1, Math.ceil(total / 10)),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.listarClientes.mockResolvedValue({
    clientes: [{ cliente_id: "c1", nome: "Maria Souza", grupo_id: "g1" }],
  });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [{ subgrupo_id: "s1", nome: "Cível" }],
  });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana Paula" }],
  });
  comLista([atendimento()]);
});

async function montar() {
  renderComProviders(<AtendimentosPage />);
  return await screen.findByRole("heading", { name: "Atendimentos" });
}

describe("lista", () => {
  it("mostra assunto, status e o nome do cliente -- não o id", async () => {
    await montar();
    expect(await screen.findByText(/Revisão de contrato/)).toBeInTheDocument();
    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    /* 🔴 Mostrar "c1" não diz nada a ninguém. O nome vem em
       `cliente_nomes`, DENTRO do atendimento -- antes a tela baixava o
       catálogo inteiro de clientes pra traduzir. */
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.queryByText("c1")).not.toBeInTheDocument();
  });

  it("a prévia é do ÚLTIMO registro, não do primeiro", async () => {
    /* A pergunta de quem varre a lista é "em que pé isso está" -- o
     * primeiro registro é o que ela já sabe. */
    comLista([
      atendimento({
        registros: [
          { autor_id: "ana@x.com", autor_nome: "Ana Paula", registrado_em: "2026-08-10T09:00:00Z", texto: "Primeiro contato" },
          { autor_id: "ana@x.com", autor_nome: "Ana Paula", registrado_em: "2026-08-12T09:00:00Z", texto: "Cliente retornou" },
        ],
      }),
    ]);
    await montar();
    expect(await screen.findByText("Cliente retornou")).toBeInTheDocument();
    expect(screen.queryByText("Primeiro contato")).not.toBeInTheDocument();
  });

  it("conta quantos mostra de quantos existem", async () => {
    comLista([atendimento()], 12);
    await montar();
    expect(await screen.findByText("Mostrando 1 de 12 atendimentos")).toBeInTheDocument();
  });

  it("abre o detalhe pelo par (subgrupo, id)", async () => {
    /* O id sozinho não endereça: a chave primária é o par. */
    await montar();
    await userEvent.click(await screen.findByRole("button", { name: /Revisão de contrato/ }));
    expect(navegou).toHaveBeenCalledWith("/atendimentos/s1/a1");
  });
});

describe("autor do último registro", () => {
  it("o avatar usa o APELIDO, não o e-mail", async () => {
    /* O avatar tira as iniciais do que recebe. Sem resolver, a lista dava
     * "AN" (de "ana@x.com") enquanto o detalhe dava "AP" (de "Ana Paula"),
     * pra mesma pessoa. */
    await montar();
    expect(await screen.findByText("AP")).toBeInTheDocument();
  });

  it("cai no e-mail quando o apelido não existe", async () => {
    /* `autor_nome` ausente: quem nunca definiu apelido, ou autor de outro
       grupo. As iniciais do e-mail ainda identificam, e sumir com o avatar
       seria pior. */
    comLista([atendimento({
      registros: [{ autor_id: "ana@x.com", autor_nome: null,
                    registrado_em: "2026-08-12T09:00:00Z", texto: "Primeiro contato" }],
    })]);
    await montar();
    expect(await screen.findByText("AN")).toBeInTheDocument();
  });
});

describe("filtros", () => {
  it("manda o status escolhido pro servidor", async () => {
    await montar();
    await userEvent.click(screen.getByRole("button", { name: /Todos/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fechados" }));

    await waitFor(() =>
      expect(mocks.listarAtendimentos).toHaveBeenCalledWith(
        expect.objectContaining({ status: "Fechado" }),
      ),
    );
  });

  it("'Todos' NÃO manda status -- é como o servidor entende 'sem filtro'", async () => {
    await montar();
    await waitFor(() => expect(mocks.listarAtendimentos).toHaveBeenCalled());
    expect(mocks.listarAtendimentos).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it("busca vai pro SERVIDOR, não é peneirada no cliente", async () => {
    // Peneirar aqui esconderia atendimento que está na página seguinte.
    await montar();
    await userEvent.type(screen.getByLabelText("Buscar atendimentos"), "contrato");

    await waitFor(
      () =>
        expect(mocks.listarAtendimentos).toHaveBeenCalledWith(
          expect.objectContaining({ busca: "contrato" }),
        ),
      { timeout: 3000 },
    );
  });
});

describe("vazio", () => {
  it("sem nada e sem filtro, diz que não há nada", async () => {
    comLista([]);
    await montar();
    expect(await screen.findByText("Nenhum atendimento registrado ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument();
  });

  it("vazio POR FILTRO diz outra coisa, e oferece limpar", async () => {
    /* Confundir os dois faz a pessoa concluir que o sistema está vazio. */
    comLista([]);
    await montar();
    await userEvent.click(screen.getByRole("button", { name: /Todos/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Fechados" }));

    expect(await screen.findByText("Nenhum atendimento com os filtros atuais.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(await screen.findByText("Nenhum atendimento registrado ainda.")).toBeInTheDocument();
  });
});

describe("criar", () => {
  it("Salvar fica travado enquanto falta obrigatório", async () => {
    await montar();
    await userEvent.click(screen.getByRole("button", { name: /Adicionar atendimento/ }));

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("cria com clientes, assunto, subgrupo e primeiro registro", async () => {
    mocks.criarAtendimento.mockResolvedValue({ atendimento_id: "novo" });
    await montar();
    await userEvent.click(screen.getByRole("button", { name: /Adicionar atendimento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByRole("combobox", { name: /Clientes/ }), "Maria");
    await userEvent.click(await within(modal).findByRole("button", { name: "Maria Souza" }));

    await userEvent.type(within(modal).getByLabelText(/Assunto/), "Nova demanda");
    await userEvent.type(within(modal).getByLabelText(/1º registro/), "Cliente ligou hoje");

    await userEvent.click(within(modal).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.criarAtendimento).toHaveBeenCalled());
    expect(mocks.criarAtendimento).toHaveBeenCalledWith({
      subgrupo_id: "s1",
      assunto: "Nova demanda",
      cliente_ids: ["c1"],
      primeiro_registro: "Cliente ligou hoje",
      processo_numero: null,
    });
  });

  it("a etiqueta do cliente escolhido mostra o NOME", async () => {
    await montar();
    await userEvent.click(screen.getByRole("button", { name: /Adicionar atendimento/ }));

    const modal = await screen.findByRole("dialog");
    await userEvent.type(within(modal).getByRole("combobox", { name: /Clientes/ }), "Maria");
    await userEvent.click(await within(modal).findByRole("button", { name: "Maria Souza" }));

    // A busca esvazia depois de escolher; a etiqueta é o único lugar onde a
    // pessoa confere se escolheu certo.
    expect(
      within(modal).getByRole("button", { name: "Remover Maria Souza" }),
    ).toBeInTheDocument();
  });
});

describe("erro", () => {
  it("oferece tentar de novo", async () => {
    mocks.listarAtendimentos.mockRejectedValue(new Error("caiu"));
    renderComProviders(<AtendimentosPage />);
    expect(
      await screen.findByRole("button", { name: /Tentar de novo/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
  });
});

describe("fidelidade ao artifact", () => {
  /* Foram três divergências reportadas de uma vez, todas por eu ter escrito
   * "parecido" em vez de conferir o CSS. O teste trava o que dá pra travar
   * em jsdom -- as MEDIDAS ficam na verificação em Chrome. */

  it("a data de criação é um elemento PRÓPRIO, separada do assunto", async () => {
    /* Ela é azul da marca e em mono no artifact -- é o que faz a lista se
     * ler por data sem que a data precise de rótulo. A COR não se testa
     * aqui: o jsdom não resolve as variáveis do tema, e a verificação real
     * é a medição em Chrome (rgb(0,143,213), IBM Plex Mono, 13.5px). O que
     * este teste trava é o que jsdom sabe: que a data não está grudada no
     * assunto, sem elemento próprio pra receber aquele estilo. */
    await montar();
    const data = await screen.findByText("10/08/2026");
    expect(data.tagName.toLowerCase()).toBe("span");
    expect(data.textContent).toBe("10/08/2026");
  });

  it("o cliente vem atrás do ícone de pessoas", async () => {
    // Diz o que aquele nome É sem gastar a palavra "cliente" em toda linha.
    await montar();
    const cliente = await screen.findByText("Maria Souza");
    const linha = cliente.closest("button");
    expect(linha?.querySelector("svg")).toBeTruthy();
  });
});
