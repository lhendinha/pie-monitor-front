import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarSubgrupos: vi.fn(),
  criarSubgrupo: vi.fn(),
  atualizarSubgrupo: vi.fn(),
  removerSubgrupo: vi.fn(),
  conteudoDoSubgrupo: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
  adicionarMembro: vi.fn(),
  removerMembro: vi.fn(),
  papelAtende: vi.fn(),
  getEmail: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import { ApiError } from "../../services/api/client";
import SubgruposPage from "./index";

const VAZIO = {
  membros: 0, processos: 0, tarefas: 0, atendimentos: 0,
  // Quinto impedimento, e o único que não é contagem. Vem do servidor: a
  // tela não tem como deduzir, porque a listagem de subgrupos é escopada
  // por participação pra `manager` mas é o grupo inteiro pra `admin`+.
  ficaria_sem_subgrupo: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.conteudoDoSubgrupo.mockResolvedValue(VAZIO);
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [{ email: "ana@argos.local" }] });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
    membros: [{ email: "ana@argos.local", apelido: "Ana Paula", papel: "admin" }],
  });
});

describe("SubgruposPage", () => {
  it("mostra a lista depois de carregar, com pagina/tamanhoPagina", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);
    expect(await screen.findByText("Cível")).toBeInTheDocument();
    expect(mocks.listarSubgrupos).toHaveBeenCalledWith({ pagina: 1, tamanhoPagina: 10 });
  });

  it("cria um subgrupo e reflete na lista via invalidateQueries", async () => {
    mocks.listarSubgrupos
      .mockResolvedValueOnce({ subgrupos: [], total: 0, total_paginas: 0 })
      .mockResolvedValueOnce({ subgrupos: [{ subgrupo_id: "2", nome: "Trabalhista" }], total: 1, total_paginas: 1 });
    mocks.criarSubgrupo.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    await user.type(screen.getByLabelText("Nome do novo subgrupo"), "Trabalhista");
    await user.click(screen.getByRole("button", { name: "Criar subgrupo" }));

    expect(await screen.findByText("Trabalhista")).toBeInTheDocument();
    expect(mocks.criarSubgrupo).toHaveBeenCalledWith("Trabalhista");
    expect(mocks.listarSubgrupos).toHaveBeenCalledTimes(2); // carga inicial + invalidate pós-criação
  });

  it("remove um subgrupo vazio -- invalida e refaz o fetch (splice otimista não é seguro com paginação real)", async () => {
    mocks.listarSubgrupos
      .mockResolvedValueOnce({ subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1 })
      .mockResolvedValueOnce({ subgrupos: [], total: 0, total_paginas: 0 });
    mocks.removerSubgrupo.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    // O rótulo carrega o nome ("Remover Cível"): com cinco linhas, cinco
    // botões "Remover" idênticos não dizem qual é qual pra quem usa leitor.
    await user.click(screen.getByRole("button", { name: /Remover Cível/ }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(screen.getByText("Nenhum subgrupo ainda.")).toBeInTheDocument());
    expect(mocks.listarSubgrupos).toHaveBeenCalledTimes(2); // carga inicial + invalidate pós-remoção
  });

  it("subgrupo com conteúdo NÃO chega a perguntar 'tem certeza?'", async () => {
    // A tela pergunta ao servidor o que tem dentro ANTES de confirmar: sem
    // isso ela mostraria o diálogo de exclusão pra uma exclusão que o
    // servidor ia recusar, e os impedimentos só apareceriam depois, como
    // erro.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    mocks.conteudoDoSubgrupo.mockResolvedValue({
      ...VAZIO, membros: 6, processos: 6, tarefas: 11, atendimentos: 8,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    await user.click(screen.getByRole("button", { name: /Remover Cível/ }));

    expect(await screen.findByText("Não dá pra excluir ainda")).toBeInTheDocument();
    // Lista, e não frase corrida: quatro impedimentos com vírgula viram um
    // parágrafo que ninguém conta.
    for (const item of ["6 membros", "6 processos", "11 tarefas", "8 atendimentos"]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(mocks.removerSubgrupo).not.toHaveBeenCalled();
  });

  it("o aviso lista só o que existe -- '0 processos' é ruído", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    mocks.conteudoDoSubgrupo.mockResolvedValue({ ...VAZIO, membros: 1 });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    await user.click(screen.getByRole("button", { name: /Remover Cível/ }));

    expect(await screen.findByText("1 membro")).toBeInTheDocument();
    expect(screen.queryByText(/processo/)).not.toBeInTheDocument();
  });

  describe("manager excluindo o próprio subgrupo", () => {
    /** Sem hierarquia de verdade, `papelAtende` mockado com `true` faria o
     * manager passar por admin -- e estes testes provariam nada. */
    function comoManager() {
      mocks.papelAtende.mockImplementation((minimo: string) => minimo !== "admin");
      mocks.getEmail.mockReturnValue("ana@argos.local");
    }

    it("a lixeira aparece no que ele criou e some no que é de outra pessoa", async () => {
      comoManager();
      mocks.listarSubgrupos.mockResolvedValue({
        subgrupos: [
          { subgrupo_id: "1", nome: "Cível", criado_por: "ana@argos.local" },
          { subgrupo_id: "2", nome: "Trabalhista", criado_por: "bruno@argos.local" },
        ],
        total: 2,
        total_paginas: 1,
      });
      renderComProviders(<SubgruposPage />);

      await screen.findByText("Cível");
      expect(screen.getByRole("button", { name: /Remover Cível/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Remover Trabalhista/ })).not.toBeInTheDocument();
    });

    it("confirma normalmente quando ele tem outro subgrupo", async () => {
      comoManager();
      mocks.listarSubgrupos.mockResolvedValue({
        subgrupos: [
          { subgrupo_id: "1", nome: "Cível", criado_por: "ana@argos.local" },
          { subgrupo_id: "2", nome: "Outro", criado_por: "ana@argos.local" },
        ],
        total: 2,
        total_paginas: 1,
      });
      mocks.removerSubgrupo.mockResolvedValue({});
      const user = userEvent.setup();
      renderComProviders(<SubgruposPage />);

      await screen.findByText("Cível");
      await user.click(screen.getByRole("button", { name: /Remover Cível/ }));
      const dialogo = within(await screen.findByRole("dialog"));
      await user.click(dialogo.getByRole("button", { name: "Excluir" }));

      await waitFor(() => expect(mocks.removerSubgrupo).toHaveBeenCalledWith("1"));
    });
  });

  it("o diálogo abre no CLIQUE, antes de a contagem chegar", async () => {
    // Já foi ao contrário: a lixeira não fazia NADA visível até a contagem
    // responder, e a pessoa clicava de novo achando que tinha falhado.
    // Este teste fica vermelho se alguém voltar a esperar em silêncio.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    // Promessa que nunca assenta = a espera congelada.
    mocks.conteudoDoSubgrupo.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    await user.click(screen.getByRole("button", { name: /Remover Cível/ }));

    const dialogo = within(await screen.findByRole("dialog"));
    expect(dialogo.getByText(/Conferindo o que ainda existe dentro de/)).toBeInTheDocument();
    // A ação destrutiva fica TRAVADA enquanto não se sabe se ela vale --
    // é o único pedaço do comportamento antigo que valia a pena manter.
    expect(dialogo.getByRole("button", { name: /Verificando/ })).toBeDisabled();
    // Cancelar continua funcionando: diálogo sem saída é pior que nenhum.
    expect(dialogo.getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(mocks.removerSubgrupo).not.toHaveBeenCalled();
  });

  describe("aviso de último subgrupo", () => {
    /** A tela NÃO deduz mais isso da listagem -- ela lê `ficaria_sem_subgrupo`
     * do servidor. Deduzir só funcionava pra quem não é admin: a listagem é
     * escopada por participação pra `manager`, mas é o grupo INTEIRO pra
     * `admin`+, então o mesmo número dizia coisas diferentes.
     *
     * É por isso que estes testes mandam listagens com `total` que
     * CONTRADIZ o campo: se a tela voltar a contar a lista, eles ficam
     * vermelhos. */
    it("avisa em vez de confirmar, e o `total` da lista não manda nada", async () => {
      // Cinco subgrupos na lista -- a dedução antiga (`total === 1`) não
      // acusaria nada aqui. É o caso do admin membro de 1 entre 5.
      mocks.listarSubgrupos.mockResolvedValue({
        subgrupos: [
          { subgrupo_id: "1", nome: "Cível" },
          { subgrupo_id: "2", nome: "Trabalhista" },
          { subgrupo_id: "3", nome: "Família" },
          { subgrupo_id: "4", nome: "Tributário" },
          { subgrupo_id: "5", nome: "Previdenciário" },
        ],
        total: 5,
        total_paginas: 1,
      });
      mocks.conteudoDoSubgrupo.mockResolvedValue({ ...VAZIO, ficaria_sem_subgrupo: true });
      const user = userEvent.setup();
      renderComProviders(<SubgruposPage />);

      await screen.findByText("Cível");
      await user.click(screen.getByRole("button", { name: /Remover Cível/ }));

      expect(await screen.findByText("Não dá pra excluir ainda")).toBeInTheDocument();
      expect(screen.getByText(/é o único subgrupo em que você participa/)).toBeInTheDocument();
      // O ponto do aviso: não pedir uma decisão que o servidor vai recusar.
      expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
      expect(mocks.removerSubgrupo).not.toHaveBeenCalled();
    });

    it("não avisa quando o servidor diz que não, mesmo com um só na lista", async () => {
      // Dados propositalmente CONTRADITÓRIOS: um subgrupo na lista (a
      // dedução antiga avisaria) e o servidor dizendo que não há
      // impedimento. Quem manda é o servidor. Como manager, porque é onde a
      // dedução antiga disparava -- de admin ela nem chegava a rodar.
      mocks.papelAtende.mockImplementation((minimo: string) => minimo !== "admin");
      mocks.getEmail.mockReturnValue("ana@argos.local");
      mocks.listarSubgrupos.mockResolvedValue({
        subgrupos: [{ subgrupo_id: "1", nome: "Cível", criado_por: "ana@argos.local" }],
        total: 1,
        total_paginas: 1,
      });
      mocks.removerSubgrupo.mockResolvedValue({});
      const user = userEvent.setup();
      renderComProviders(<SubgruposPage />);

      await screen.findByText("Cível");
      await user.click(screen.getByRole("button", { name: /Remover Cível/ }));
      const dialogo = within(await screen.findByRole("dialog"));
      await user.click(dialogo.getByRole("button", { name: "Excluir" }));

      await waitFor(() => expect(mocks.removerSubgrupo).toHaveBeenCalledWith("1"));
    });

    it("o aviso de último subgrupo vence o de conteúdo -- é a ordem do servidor", async () => {
      // Os dois impedimentos ao mesmo tempo. Mostrar o de conteúdo primeiro
      // faria a pessoa esvaziar o subgrupo pra só então descobrir que ainda
      // não pode excluir.
      mocks.listarSubgrupos.mockResolvedValue({
        subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
      });
      mocks.conteudoDoSubgrupo.mockResolvedValue({
        ...VAZIO, processos: 6, ficaria_sem_subgrupo: true,
      });
      const user = userEvent.setup();
      renderComProviders(<SubgruposPage />);

      await screen.findByText("Cível");
      await user.click(screen.getByRole("button", { name: /Remover Cível/ }));

      expect(await screen.findByText(/é o único subgrupo em que você participa/)).toBeInTheDocument();
      expect(screen.queryByText("6 processos")).not.toBeInTheDocument();
    });
  });

  it("renomeia NA PRÓPRIA LINHA, sem modal -- Enter confirma", async () => {
    // Trocar uma palavra não justifica abrir uma janela: no artifact o nome
    // vira campo no lugar.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    mocks.atualizarSubgrupo.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByText("Cível"));

    const nomeInput = await screen.findByLabelText("Novo nome de Cível");
    await user.clear(nomeInput);
    await user.type(nomeInput, "Cível (editado){Enter}");

    await waitFor(() => expect(mocks.atualizarSubgrupo).toHaveBeenCalledWith("1", "Cível (editado)"));
  });

  it("Escape desiste de renomear -- não chama a API", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByText("Cível"));
    await user.type(await screen.findByLabelText("Novo nome de Cível"), "outro{Escape}");

    expect(mocks.atualizarSubgrupo).not.toHaveBeenCalled();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
  });

  it("campo esvaziado não renomeia pra vazio -- sair do campo é desistir", async () => {
    // Controle: sem isto, apagar tudo e clicar fora mandaria `nome: ""` --
    // que o servidor recusa, mas com um toast de erro que a pessoa não
    // pediu.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByText("Cível"));
    await user.clear(await screen.findByLabelText("Novo nome de Cível"));
    await user.tab();

    expect(mocks.atualizarSubgrupo).not.toHaveBeenCalled();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
  });

  it("mostra quantos membros e quantas colunas cada subgrupo tem", async () => {
    // Campos derivados, contados pela API na própria listagem -- sem eles a
    // tela pediria membros e quadro de cada linha, uma requisição por linha.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);

    expect(await screen.findByRole("button", { name: "Ver membros de Cível" })).toHaveTextContent(
      "1 membro",
    );
    expect(screen.getByText("· 3 colunas")).toBeInTheDocument();
  });

  it("a contagem de membros abre quem está no subgrupo", async () => {
    // "3 membros" responde quantos; clicar responde quem. Sob demanda: uma
    // requisição quando alguém pergunta, em vez de uma por subgrupo ao abrir
    // a aba.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));

    expect(await screen.findByText("Membros do Cível")).toBeInTheDocument();
    // Apelido e papel vêm da lista do grupo -- a lista por subgrupo só traz
    // o e-mail.
    expect(screen.getByText("Ana Paula")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(mocks.listarMembrosDoSubgrupo).toHaveBeenCalledWith("1");
  });

  it("subgrupo sem ninguém diz isso em vez de lista vazia", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 0, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));

    expect(await screen.findByText("Ninguém neste subgrupo ainda.")).toBeInTheDocument();
  });

  it("adiciona alguém ao subgrupo pelo modal", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    mocks.adicionarMembro.mockResolvedValue({ mensagem: "adicionado", email: "novo@x.com" });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));
    await user.type(await screen.findByLabelText("Adicionar alguém a Cível"), "novo@x.com");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => expect(mocks.adicionarMembro).toHaveBeenCalledWith("1", "novo@x.com"));
  });

  it("e-mail malformado não chega a ser enviado", async () => {
    // O servidor recusa do mesmo jeito -- isto é pra a pessoa não descobrir
    // o erro de digitação só depois de mandar.
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));
    await user.type(await screen.findByLabelText("Adicionar alguém a Cível"), "isso-nao-e-email");

    expect(await screen.findByText("E-mail inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar" })).toBeDisabled();
    expect(mocks.adicionarMembro).not.toHaveBeenCalled();
  });

  it("remove alguém do subgrupo", async () => {
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    mocks.removerMembro.mockResolvedValue({});
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));
    await user.click(await screen.findByRole("button", { name: "Remover Ana Paula de Cível" }));

    // 🔴 Passa pelo diálogo agora. Tirar alguém do subgrupo SOLTA as tarefas
    // dela lá dentro, e a lixeira executava direto -- enquanto excluir o
    // subgrupo, que é menos destrutivo, já tinha confirmação. A própria
    // página declara essa convenção.
    expect(await screen.findByText(/As tarefas dela neste subgrupo/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover" }));

    await waitFor(() =>
      expect(mocks.removerMembro).toHaveBeenCalledWith("1", "ana@argos.local"),
    );
  });

  it("a lista de membros espera as DUAS consultas antes de desenhar", async () => {
    /* A lista por subgrupo só traz e-mail; o apelido e o papel vêm da lista
     * do grupo. Esperando só a primeira, as linhas apareciam com o e-mail
     * cru e a etiqueta de papel vazia, e trocavam sozinhas na frente da
     * pessoa. A do grupo aqui nunca assenta. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 1, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    mocks.listarTodosOsMembrosDoGrupo.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));
    await screen.findByText("Membros do Cível");

    // Nada de linha com o e-mail cru enquanto o apelido não chega.
    expect(screen.queryByText("ana@argos.local")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Remover .* de Cível/ }),
    ).not.toBeInTheDocument();
  });

  it("a lixeira de membro trava SÓ a linha clicada", async () => {
    /* Travar a lista inteira num modal de dez membros esconde qual deles
     * está saindo -- e não travar nada faz a pessoa clicar de novo achando
     * que falhou. A remoção aqui nunca assenta. */
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível", membros: 2, colunas: 3 }],
      total: 1, total_paginas: 1,
    });
    mocks.listarMembrosDoSubgrupo.mockResolvedValue({
      membros: [{ email: "ana@argos.local" }, { email: "bruno@argos.local" }],
    });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [
        { email: "ana@argos.local", apelido: "Ana Paula", papel: "admin" },
        { email: "bruno@argos.local", apelido: "Bruno Reis", papel: "user" },
      ],
    });
    mocks.removerMembro.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await user.click(await screen.findByRole("button", { name: "Ver membros de Cível" }));
    await user.click(await screen.findByRole("button", { name: "Remover Ana Paula de Cível" }));
    // A lixeira abre o diálogo; a remoção começa ao confirmar.
    await user.click(await screen.findByRole("button", { name: "Remover" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remover Ana Paula de Cível" })).toBeDisabled(),
    );
    // A outra linha continua utilizável.
    expect(screen.getByRole("button", { name: "Remover Bruno Reis de Cível" })).toBeEnabled();
  });

  it("erro ao criar mostra a mensagem da ApiError e marca o campo inválido", async () => {
    mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [], total: 0, total_paginas: 0 });
    mocks.criarSubgrupo.mockRejectedValue(new ApiError("Já existe um subgrupo com esse nome", 400));
    const user = userEvent.setup();
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Nenhum subgrupo ainda.");
    await user.type(screen.getByLabelText("Nome do novo subgrupo"), "Cível");
    await user.click(screen.getByRole("button", { name: "Criar subgrupo" }));

    expect(await screen.findByText("Já existe um subgrupo com esse nome")).toBeInTheDocument();
  });

  it("sem permissão (papelAtende falso), não mostra o form nem o botão de remover", async () => {
    mocks.papelAtende.mockReturnValue(false);
    mocks.listarSubgrupos.mockResolvedValue({
      subgrupos: [{ subgrupo_id: "1", nome: "Cível" }], total: 1, total_paginas: 1,
    });
    renderComProviders(<SubgruposPage />);

    await screen.findByText("Cível");
    expect(screen.queryByLabelText("Nome do novo subgrupo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Renomear/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover/ })).not.toBeInTheDocument();
  });
});
