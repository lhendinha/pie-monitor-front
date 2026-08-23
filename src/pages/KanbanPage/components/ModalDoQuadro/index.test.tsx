import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarTarefas: vi.fn(),
  criarColuna: vi.fn(),
  atualizarColuna: vi.fn(),
  marcarColunaConclusao: vi.fn(),
  removerColuna: vi.fn(),
}));

vi.mock("../../../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../../../services")>();
  return { ...real, ...mocks };
});

import ModalDoQuadro from "./index";

const COLUNAS = [
  { subgrupo_id: "sg", coluna_id: "c1", nome: "A Fazer", ordem: 1, e_conclusao: false, e_arquivado: false },
  { subgrupo_id: "sg", coluna_id: "c2", nome: "Fazendo", ordem: 2, e_conclusao: false, e_arquivado: false },
  { subgrupo_id: "sg", coluna_id: "c3", nome: "Concluído", ordem: 3, e_conclusao: true, e_arquivado: false },
  { subgrupo_id: "sg", coluna_id: "c4", nome: "Arquivado", ordem: 4, e_conclusao: false, e_arquivado: true },
];

const tarefa = (id: string, coluna: string) => ({
  subgrupo_id: "sg",
  tarefa_id: id,
  titulo: `Tarefa ${id}`,
  data: "2026-09-01",
  coluna_id: coluna,
  prioridade: "Média",
});

function montar(colunas = COLUNAS, tarefas = [tarefa("t1", "c2"), tarefa("t2", "c2")]) {
  /* O modal conta as tarefas ele mesmo, SEM janela de data -- o quadro
     respeita o filtro de período e o aviso de exclusão não pode. */
  mocks.listarTarefas.mockResolvedValue({ tarefas, total: tarefas.length, total_paginas: 1 });
  const onFechar = vi.fn();
  renderComProviders(
    <ModalDoQuadro
      subgrupoId="sg"
      subgrupoNome="Trabalhista"
      colunas={colunas}
      onFechar={onFechar}
    />,
  );
  return onFechar;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.criarColuna.mockResolvedValue({});
  mocks.atualizarColuna.mockResolvedValue({});
  mocks.marcarColunaConclusao.mockResolvedValue({});
  mocks.removerColuna.mockResolvedValue({});
});

/** DOIS diálogos ficam no DOM ao confirmar: o "Editar quadro" e o de
 * confirmação por cima dele. O de confirmação é o último montado. */
function ultimoDialogo(dialogos: HTMLElement[]) {
  return dialogos[dialogos.length - 1];
}

describe("ModalDoQuadro", () => {
  it("lista as colunas na ordem do quadro, com a contagem de cada uma", async () => {
    montar();

    expect(screen.getByText("A Fazer")).toBeInTheDocument();
    // A contagem é o que a pessoa precisa ver ANTES de excluir: as tarefas
    // não somem, mudam de coluna.
    expect(await screen.findByText("2 tarefas")).toBeInTheDocument();
  });

  it("conta as tarefas SEM janela de data -- o filtro do quadro não vale aqui", async () => {
    /* O quadro respeita o filtro de período; este aviso não pode. Filtrado
     * em "Hoje", reaproveitar a lista do quadro faria o diálogo anunciar
     * "2 tarefas vão para X" enquanto o servidor moveria as cinquenta que
     * existem -- frase falsa sobre uma ação destrutiva. */
    montar();

    await screen.findByText("2 tarefas");
    const chamada = mocks.listarTarefas.mock.calls[0][0];
    expect(chamada.subgrupoId).toBe("sg");
    expect(chamada.dataDe).toBeUndefined();
    expect(chamada.dataAte).toBeUndefined();
  });

  it("a coluna de conclusão é dita por ESCRITO, não só por ícone", () => {
    /* "O que essa coluna tem de diferente" é a pergunta que a lista precisa
     * responder de relance, e cor/ícone sozinhos não contam essa história.
     *
     * A busca é pela ETIQUETA da linha: o parágrafo de topo também contém a
     * palavra "conclusão", e um `getByText` solto casava com os dois. */
    montar();
    const linha = screen.getByText("Concluído").closest("div")!;
    expect(within(linha).getByText("conclusão")).toBeInTheDocument();
  });

  it("a coluna de ARQUIVADO é totalmente fechada", () => {
    /* Não se renomeia, não se move, não se exclui e não vira conclusão --
     * é infraestrutura do arquivamento automático, não uma escolha de quem
     * monta o quadro. Marcá-la como conclusão faria toda tarefa nova
     * nascer arquivada. */
    montar();

    expect(screen.queryByRole("button", { name: "Excluir Arquivado" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Marcar Arquivado como/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reordenar Arquivado" })).not.toBeInTheDocument();
    // A conclusão também não se arrasta, mas o nome dela É editável.
    expect(screen.queryByRole("button", { name: "Reordenar Concluído" })).not.toBeInTheDocument();
  });

  it("clicar no nome do Arquivado NÃO abre edição", async () => {
    const user = userEvent.setup();
    montar();

    /* Ancora na ETIQUETA da linha: o parágrafo de topo também cita
       "Arquivado", e "0 tarefas" aparece em três linhas. A etiqueta
       minúscula só existe nesta. */
    const linha = screen.getByText("arquivado").closest("div")!.parentElement!;
    await user.click(within(linha).getByText("Arquivado"));
    expect(screen.queryByLabelText("Novo nome de Arquivado")).not.toBeInTheDocument();
  });

  it("a coluna de conclusão NÃO pode ser excluída nem remarcada", () => {
    /* Sem ela o quadro fica sem como concluir nada -- e toda tarefa já
     * concluída viraria aberta de novo. O servidor recusa; aqui os botões
     * nem aparecem, pra não oferecer o que vai falhar. */
    montar();

    expect(screen.queryByRole("button", { name: "Excluir Concluído" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Marcar Concluído como/ }),
    ).not.toBeInTheDocument();
  });

  it("com UMA comum só, a lixeira dela some", () => {
    /* O quadro precisa de pelo menos uma coluna ALÉM da de conclusão. Sem
     * isso: toda tarefa nova nasceria já concluída, e excluir a última
     * comum mandava as tarefas ABERTAS dela pra conclusão -- não há coluna
     * anterior, então o destino vira a seguinte. */
    montar([COLUNAS[0], COLUNAS[2], COLUNAS[3]], []);
    expect(screen.queryByRole("button", { name: "Excluir A Fazer" })).not.toBeInTheDocument();
  });

  it("cria coluna e limpa o campo", async () => {
    const user = userEvent.setup();
    montar();

    await user.type(screen.getByLabelText("Nova coluna"), "Revisão");
    await user.click(screen.getByRole("button", { name: /Adicionar/ }));

    await waitFor(() => expect(mocks.criarColuna).toHaveBeenCalledWith("sg", "Revisão"));
    await waitFor(() => expect(screen.getByLabelText("Nova coluna")).toHaveValue(""));
  });

  it("não cria coluna sem nome", async () => {
    montar();
    expect(screen.getByRole("button", { name: /Adicionar/ })).toBeDisabled();
  });

  it("marcar conclusão manda só o id da coluna", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(
      screen.getByRole("button", { name: "Marcar A Fazer como coluna de conclusão" }),
    );

    await waitFor(() => expect(mocks.marcarColunaConclusao).toHaveBeenCalledWith("sg", "c1"));
  });

  it("excluir avisa PRA ONDE as tarefas vão, e só exclui depois de confirmar", async () => {
    /* O medo aqui é perder tarefa, e não é isso que acontece: elas mudam de
     * coluna. Dizer pra onde é o que desarma o medo. "Fazendo" tem 2
     * tarefas e a coluna anterior é "A Fazer". */
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole("button", { name: "Excluir Fazendo" }));

    const dialogo = within(ultimoDialogo(await screen.findAllByRole("dialog")));
    expect(dialogo.getByText(/2 tarefas vão para "A Fazer"/)).toBeInTheDocument();
    expect(mocks.removerColuna).not.toHaveBeenCalled();

    await user.click(dialogo.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(mocks.removerColuna).toHaveBeenCalledWith("sg", "c2"));
  });

  it("coluna vazia não ganha aviso de tarefas -- '0 tarefas' é ruído", async () => {
    const user = userEvent.setup();
    montar(COLUNAS, []);

    await user.click(screen.getByRole("button", { name: "Excluir Fazendo" }));

    const dialogo = within(ultimoDialogo(await screen.findAllByRole("dialog")));
    expect(dialogo.queryByText(/vão para/)).not.toBeInTheDocument();
  });

  it("a coluna de CONCLUSÃO também pode ser renomeada", async () => {
    /* Ela não pode ser excluída nem desmarcada -- sem ela o quadro fica sem
     * como concluir nada. Mas o NOME é só texto: um erro de digitação em
     * "Concluído" seria impossível de corrigir, e o servidor não distingue.
     *
     * A linha dela não tem botão nenhum à direita, então este é o caso em
     * que ninguém pensa em tentar clicar no nome. */
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByText("Concluído"));
    const campo = screen.getByLabelText("Novo nome de Concluído");
    await user.clear(campo);
    await user.type(campo, "Finalizado{Enter}");

    await waitFor(() =>
      expect(mocks.atualizarColuna).toHaveBeenCalledWith("sg", "c3", { nome: "Finalizado" }),
    );
  });

  it("renomear manda SÓ o nome, nunca a ordem", async () => {
    /* Reenviar a `ordem` sobrescreveria um arraste concorrente com um valor
     * possivelmente defasado -- desfazendo a reordenação de outra pessoa. */
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByText("A Fazer"));
    const campo = screen.getByLabelText("Novo nome de A Fazer");
    await user.clear(campo);
    await user.type(campo, "Backlog{Enter}");

    await waitFor(() =>
      expect(mocks.atualizarColuna).toHaveBeenCalledWith("sg", "c1", { nome: "Backlog" }),
    );
  });
});
