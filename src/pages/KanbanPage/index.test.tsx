import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  listarSubgrupos: vi.fn(),
  listarQuadro: vi.fn(),
  listarTarefas: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
  /* O que a PÍLULA de pessoas usa -- ver `usePessoasBuscaveis`. */
  listarMembrosDoGrupo: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  detalhesTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  papelAtende: vi.fn(),
  removerTarefasEmLote: vi.fn(),
  concluirTarefasEmLote: vi.fn(),
  alterarStatusEmLote: vi.fn(),
  atribuirTarefasEmLote: vi.fn(),
}));

vi.mock("../../services", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services")>();
  return { ...real, ...mocks };
});

import { ApiError } from "../../services/api/client";
import KanbanPage from "./index";

const TAREFA_DO_LINK = {
  subgrupo_id: "sg-trab",
  tarefa_id: "t-atrasada",
  titulo: "Protocolar recurso",
  /* Data ANTIGA de propósito: lembrete de prazo é justamente de tarefa
     atrasada, e o quadro abre filtrado no mês. Se a tela dependesse de a
     tarefa aparecer na listagem, este é o caso que falharia. */
  data: "2020-01-15",
  coluna_id: "c1",
  prioridade: "Alta",
};

const COLUNAS_TRAB = [
  { subgrupo_id: "sg-trab", coluna_id: "c1", nome: "A Fazer", ordem: 1, e_conclusao: false, e_arquivado: false },
  { subgrupo_id: "sg-trab", coluna_id: "c2", nome: "Concluído", ordem: 2, e_conclusao: true, e_arquivado: false },
  { subgrupo_id: "sg-trab", coluna_id: "c3", nome: "Arquivado", ordem: 3, e_conclusao: false, e_arquivado: true },
];

/* Nomes que NÃO se repetem no outro quadro: se os dois tivessem "A Fazer",
   o teste não saberia dizer de qual quadro veio a coluna oferecida. */
const COLUNAS_CIVEL = [
  { subgrupo_id: "sg-civel", coluna_id: "cv1", nome: "Triagem", ordem: 1, e_conclusao: false, e_arquivado: false },
  { subgrupo_id: "sg-civel", coluna_id: "cv2", nome: "Sentenciado", ordem: 2, e_conclusao: true, e_arquivado: false },
];

/** Abre a tela já no quadro do Trabalhista -- o único dos dois que tem
 * coluna de Arquivado, e o dono das colunas que as tarefas de teste usam.
 *
 * Explícito de propósito. Antes esses testes dependiam de o quadro padrão
 * ser "o último da lista", que era uma regra implícita e hoje nem existe
 * mais: o que decide é a memória do último subgrupo usado. */
function lembrarTrabalhista() {
  localStorage.setItem(
    "pje-monitor-ultimo-subgrupo-kanban",
    JSON.stringify({ id: "sg-trab", nome: "Trabalhista" }),
  );
}

function montar(tarefaDoLink?: { subgrupoId: string; tarefaId: string }) {
  return renderComProviders(
    <MemoryRouter>
      <KanbanPage tarefaDoLink={tarefaDoLink} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  /* ⚠️ O quadro padrão passou a ser LEMBRADO em `localStorage`. Sem limpar,
     o subgrupo escolhido num teste decide em qual quadro o próximo abre. */
  localStorage.clear();
  mocks.papelAtende.mockReturnValue(true);
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "sg-civel", nome: "Cível" },
      { subgrupo_id: "sg-trab", nome: "Trabalhista" },
    ],
    total: 2,
    total_paginas: 1,
  });
  /* Cada subgrupo tem o PRÓPRIO quadro, com ids próprios. Um mock único pra
     todo subgrupo esconderia justamente o defeito que a suíte precisa ver. */
  mocks.listarQuadro.mockImplementation((subgrupoId: string) =>
    Promise.resolve({ colunas: subgrupoId === "sg-civel" ? COLUNAS_CIVEL : COLUNAS_TRAB }),
  );
  // A listagem do quadro NÃO contém a tarefa do link -- é o ponto.
  mocks.listarTarefas.mockResolvedValue({ tarefas: [], total: 0, total_paginas: 0 });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [] });
  mocks.listarMembrosDoGrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana" }],
    total: 1,
    total_paginas: 1,
  });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.criarTarefa.mockResolvedValue({ tarefa_id: "nova" });
  mocks.detalhesTarefa.mockResolvedValue(TAREFA_DO_LINK);
  mocks.removerTarefasEmLote.mockResolvedValue({ removidas: 0, ignoradas: [], recusadas: [] });
});

/** 🔴 O NOME do subgrupo quando o link aponta para um fora da primeira página.
 *
 * O quadro só conhecia o nome pela primeira página da pílula ou pela memória
 * do último subgrupo usado -- e a memória entrava SEM conferir o id. Com outro
 * subgrupo lembrado, a pílula, o modal e as confirmações do lote diziam o nome
 * ERRADO; sem memória, diziam o id cru. Medido em Chrome contra o offline. */
describe("KanbanPage — o nome do subgrupo do link", () => {
  const CATALOGO = [
    { subgrupo_id: "sg-civel", nome: "Cível" },
    { subgrupo_id: "sg-trab", nome: "Trabalhista" },
    { subgrupo_id: "sg-fora", nome: "Civil" },
  ];

  /** A pílula pede a primeira página (sem `pagina`); o catálogo pede todas
   * (com `pagina`). Só o catálogo conhece o subgrupo do link. */
  function subgruposComUmForaDaPrimeiraPagina(catalogoFalha = false) {
    mocks.listarSubgrupos.mockImplementation((opcoes: { pagina?: number } = {}) => {
      if (!opcoes.pagina) {
        return Promise.resolve({ subgrupos: CATALOGO.slice(0, 2), total: 3, total_paginas: 2 });
      }
      if (catalogoFalha) return Promise.reject(new ApiError("Falhou", 500));
      return Promise.resolve({ subgrupos: CATALOGO, total: 3, total_paginas: 1 });
    });
    mocks.detalhesTarefa.mockResolvedValue({ ...TAREFA_DO_LINK, subgrupo_id: "sg-fora" });
  }

  function comCartao(subgrupoId: string, titulo: string) {
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [{ subgrupo_id: subgrupoId, tarefa_id: "cartao", titulo, data: "2026-09-10",
        coluna_id: "c1", prioridade: "Alta", responsavel_id: null }],
      total: 1,
      total_paginas: 1,
    });
  }

  /** Fecha o modal do link, marca o cartão e abre a confirmação de excluir:
   * é nela que o nome errado fazia estrago. */
  async function confirmacaoDeExcluir(titulo: string) {
    const usuario = userEvent.setup();
    await screen.findByDisplayValue("Protocolar recurso");
    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));
    await screen.findByText(titulo);
    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    await usuario.click(screen.getByRole("checkbox", { name: `Selecionar ${titulo}` }));
    await usuario.click(screen.getByRole("button", { name: "Excluir 1" }));
    return screen.findByRole("dialog");
  }

  it("🔴 com OUTRO subgrupo lembrado, diz o nome do subgrupo do link", async () => {
    lembrarTrabalhista();
    subgruposComUmForaDaPrimeiraPagina();
    comCartao("sg-fora", "Cartão do Civil");
    montar({ subgrupoId: "sg-fora", tarefaId: "t-atrasada" });

    await screen.findByDisplayValue("Protocolar recurso");
    await waitFor(() => expect(screen.getAllByText("Civil").length).toBeGreaterThan(0));
    expect(screen.queryByText("Trabalhista")).not.toBeInTheDocument();
    expect(screen.queryByText("sg-fora")).not.toBeInTheDocument();

    const dialogo = await confirmacaoDeExcluir("Cartão do Civil");
    expect(dialogo).toHaveTextContent("de Civil");
    expect(dialogo).not.toHaveTextContent("Trabalhista");
  });

  it("🔴 sem nada lembrado, diz o nome -- não o id", async () => {
    subgruposComUmForaDaPrimeiraPagina();
    montar({ subgrupoId: "sg-fora", tarefaId: "t-atrasada" });

    await screen.findByDisplayValue("Protocolar recurso");
    await waitFor(() => expect(screen.getAllByText("Civil").length).toBeGreaterThan(0));
    expect(screen.queryByText("sg-fora")).not.toBeInTheDocument();
  });

  it("par negativo: subgrupo da primeira página tem nome mesmo sem o catálogo", async () => {
    /* A primeira página basta: o catálogo é só para quem está fora dela. */
    subgruposComUmForaDaPrimeiraPagina(true);
    mocks.detalhesTarefa.mockResolvedValue(TAREFA_DO_LINK);
    comCartao("sg-trab", "Cartão do Trabalhista");
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    await screen.findByDisplayValue("Protocolar recurso");
    expect((await screen.findAllByText("Trabalhista")).length).toBeGreaterThan(0);
    expect(screen.queryByText("sg-trab")).not.toBeInTheDocument();

    /* A pílula e o modal tiram o nome das PRÓPRIAS opções; a confirmação,
       não -- é ela que prova que a primeira página basta. */
    const dialogo = await confirmacaoDeExcluir("Cartão do Trabalhista");
    expect(dialogo).toHaveTextContent("de Trabalhista");
    expect(dialogo).not.toHaveTextContent("sg-trab");
  });

  it("a memória do MESMO subgrupo vale mesmo com o catálogo fora do ar", async () => {
    localStorage.setItem(
      "pje-monitor-ultimo-subgrupo-kanban",
      JSON.stringify({ id: "sg-fora", nome: "Civil" }),
    );
    subgruposComUmForaDaPrimeiraPagina(true);
    montar({ subgrupoId: "sg-fora", tarefaId: "t-atrasada" });

    await screen.findByDisplayValue("Protocolar recurso");
    expect((await screen.findAllByText("Civil")).length).toBeGreaterThan(0);
    expect(screen.queryByText("sg-fora")).not.toBeInTheDocument();
  });
});

describe("KanbanPage — link do lembrete de prazo", () => {
  it("abre o modal da tarefa mesmo ela estando FORA da janela do quadro", async () => {
    /* O quadro abre filtrado no mês, e lembrete de prazo é de tarefa
     * atrasada. Esperar que ela apareça na listagem não funcionaria
     * justamente nos casos que mais geram lembrete. */
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    expect(await screen.findByDisplayValue("Protocolar recurso")).toBeInTheDocument();
    expect(mocks.detalhesTarefa).toHaveBeenCalledWith("sg-trab", "t-atrasada");
  });

  it("abre o quadro DO SUBGRUPO da tarefa, não o padrão", async () => {
    // Sem isto a tarefa do link apareceria num quadro que não é o dela.
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    await waitFor(() => expect(mocks.listarQuadro).toHaveBeenCalledWith("sg-trab"));
  });

  it("🔴 sem nada lembrado, abre no PRIMEIRO da lista", async () => {
    /* Era `subgrupos[subgrupos.length - 1]`, com o comentário "o último da
     * lista, que é o mais recente, que é o que costuma estar em uso" -- e
     * nenhuma das três afirmações valia. A listagem passou a vir em ordem
     * ALFABÉTICA, então o último é só o último do alfabeto. */
    montar();

    await waitFor(() => expect(mocks.listarQuadro).toHaveBeenCalledWith("sg-civel"));
  });

  it("🔴 mas abre no ÚLTIMO QUE A PESSOA USOU, quando há um lembrado", async () => {
    /* Quem trabalha sempre no mesmo subgrupo trocava a pílula toda vez que
     * entrava na tela. A memória acerta em quem tem rotina e não piora nada
     * pra quem não tem -- na primeira visita o comportamento é o mesmo. */
    localStorage.setItem(
      "pje-monitor-ultimo-subgrupo-kanban",
      JSON.stringify({ id: "sg-trab", nome: "Trabalhista" }),
    );
    montar();

    await waitFor(() => expect(mocks.listarQuadro).toHaveBeenCalledWith("sg-trab"));
  });

  it("e o link do lembrete VENCE a memória", async () => {
    /* A memória é um palpite; o link é uma instrução. Ela não pode desviar
     * quem clicou num e-mail apontando pra uma tarefa específica. */
    localStorage.setItem(
      "pje-monitor-ultimo-subgrupo-kanban",
      JSON.stringify({ id: "sg-trab", nome: "Trabalhista" }),
    );
    montar({ subgrupoId: "sg-civel", tarefaId: "t-atrasada" });

    await waitFor(() => expect(mocks.listarQuadro).toHaveBeenCalledWith("sg-civel"));
  });

  it("fechar o modal NÃO o reabre", async () => {
    /* ⚠️ Este NÃO é controle da trava `linkConsumido`: conferi tirando a
     * trava e ele continua verde. O efeito só reroda quando as deps mudam,
     * e fechar o modal não mexe em `tarefaDoLinkQuery.data`.
     *
     * O que a trava protege é outra coisa, que este teste não alcança: ela
     * também desliga a consulta (`enabled: !linkConsumido`), e sem isso um
     * refetch -- `staleTime` é 0 no projeto inteiro -- devolveria o mesmo
     * dado e reabriria o modal por cima de quem já tinha fechado.
     *
     * Fica assim mesmo: cobre o caminho comum, e o comentário evita que
     * alguém confie nele pra mexer na trava. */
    const user = userEvent.setup();
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    await screen.findByDisplayValue("Protocolar recurso");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByDisplayValue("Protocolar recurso")).not.toBeInTheDocument(),
    );
  });

  it("tarefa excluída avisa e deixa o quadro utilizável", async () => {
    /* Link velho aponta pra tarefa que pode não existir mais. O quadro tem
     * que continuar sendo uma tela útil, e não um erro de página inteira. */
    mocks.detalhesTarefa.mockRejectedValue(new ApiError("Tarefa não encontrada", 404));
    montar({ subgrupoId: "sg-trab", tarefaId: "sumida" });

    expect(
      await screen.findByText(/Não foi possível abrir a tarefa do link/),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Gestão kanban" })).toBeInTheDocument();
  });

  it("o Arquivado NÃO aparece no quadro por padrão", async () => {
    /* Depósito do que já saiu do fluxo -- à vista o tempo todo, rouba uma
     * coluna de largura pro que ninguém está tocando. */
    lembrarTrabalhista();
    montar();

    expect(await screen.findByText("A Fazer")).toBeInTheDocument();
    expect(screen.queryByText("Arquivado")).not.toBeInTheDocument();
  });

  it("a pílula revela a coluna, e o rótulo diz o ESTADO", async () => {
    const user = userEvent.setup();
    lembrarTrabalhista();
    montar();

    await user.click(await screen.findByRole("button", { name: "Sem arquivadas" }));

    expect(await screen.findByText("Arquivado")).toBeInTheDocument();
    // O rótulo vira o estado novo, como as outras pílulas da barra.
    expect(screen.getByRole("button", { name: "Com arquivadas" })).toBeInTheDocument();
  });

  it("'Limpar filtros' NÃO esconde a coluna revelada", async () => {
    /* Ligar ADICIONA uma coluna, nunca esconde tarefa -- não é filtro, é
     * preferência de visualização. Limpar não pode desfazer o que a pessoa
     * acabou de revelar. */
    const user = userEvent.setup();
    lembrarTrabalhista();
    montar();

    await user.click(await screen.findByRole("button", { name: "Sem arquivadas" }));
    await screen.findByText("Arquivado");
    await user.type(screen.getByLabelText(/Pesquisar cartão/), "nada-encontra-isso");
    const limpar = await screen.findByRole("button", { name: "Limpar filtros" });
    await user.click(limpar);

    expect(await screen.findByText("Arquivado")).toBeInTheDocument();
  });

  it("sem link, não busca tarefa nenhuma", async () => {
    // Controle: o Kanban normal não pode ganhar uma requisição a mais.
    montar();

    await screen.findByRole("heading", { name: "Gestão kanban" });
    expect(mocks.detalhesTarefa).not.toHaveBeenCalled();
  });
});

describe("busca por texto", () => {
  it("🔴 filtra de verdade -- antes casava com TODO cartão", async () => {
    /* `(t.processo_numero || "").includes(busca.replace(/\D/g, ""))`: com
     * uma busca sem número, o segundo argumento vira `""`, e `"".includes("")`
     * é `true` -- para toda tarefa, inclusive as sem processo. Digitar
     * "recurso" no campo não mudava nada no quadro, e o estado vazio nunca
     * aparecia. Só funcionava digitando número. */
    const user = userEvent.setup();
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        { ...TAREFA_DO_LINK, tarefa_id: "t-a", titulo: "Protocolar recurso", data: "2026-08-20" },
        { ...TAREFA_DO_LINK, tarefa_id: "t-b", titulo: "Audiência de conciliação", data: "2026-08-20" },
      ],
      total: 2,
      total_paginas: 1,
    });
    lembrarTrabalhista();
    montar();

    await screen.findByText("Protocolar recurso");
    await user.type(screen.getByLabelText(/Pesquisar cartão/), "recurso");

    await waitFor(() =>
      expect(screen.queryByText("Audiência de conciliação")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Protocolar recurso")).toBeInTheDocument();
  });
});

describe("criar tarefa em OUTRO subgrupo", () => {
  /* 🔴 O quadro e os membros chegavam ao modal por prop, vindos da página --
   * que só conhece o subgrupo que está exibindo. Trocar o subgrupo no
   * formulário não recarregava nenhum dos dois, então o seletor continuava
   * oferecendo as colunas do quadro ANTERIOR e o `POST` batia na validação
   * do servidor: "A coluna não pertence ao quadro deste subgrupo".
   *
   * Na prática: quem participa de mais de um subgrupo só conseguia criar
   * tarefa no que estivesse aberto na tela. O seletor de subgrupo existia e
   * não servia pra nada -- pior que não existir, porque prometia. */

  async function abrirNovaTarefaETrocarPara(nome: string) {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: /Nova tarefa/ }));
    const modal = await screen.findByRole("dialog");

    // O quadro abre no primeiro subgrupo da lista (Cível).
    await within(modal).findByText("Triagem");
    await user.click(within(modal).getByText("Cível"));
    /* ⚠️ `screen`, não `within(modal)`: o `Select` manda o menu pra um
       portal em `document.body` (`menuPortalTarget`), então as opções
       ficam FORA do diálogo. Por `role="option"` também não colide com o
       nome do subgrupo no chip de filtro da página. */
    await user.click(await screen.findByRole("option", { name: nome }));
    return { user, modal };
  }

  it("oferece as colunas do subgrupo ESCOLHIDO, não as do quadro aberto", async () => {
    const { modal } = await abrirNovaTarefaETrocarPara("Trabalhista");

    expect(await within(modal).findByText("A Fazer")).toBeInTheDocument();
    // A coluna do quadro anterior não pode sobreviver à troca: era ela que
    // o servidor recusava.
    expect(within(modal).queryByText("Triagem")).not.toBeInTheDocument();
  });

  it("salva com a coluna do quadro do subgrupo escolhido", async () => {
    const { user, modal } = await abrirNovaTarefaETrocarPara("Trabalhista");
    await within(modal).findByText("A Fazer");

    await user.type(within(modal).getByLabelText(/Descrição da tarefa/), "Petição inicial");
    await user.click(within(modal).getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.criarTarefa).toHaveBeenCalled());
    expect(mocks.criarTarefa).toHaveBeenCalledWith(
      expect.objectContaining({ subgrupo_id: "sg-trab", coluna_id: "c1" }),
    );
  });

  it("pede os membros DO SUBGRUPO escolhido, não os do grupo inteiro", async () => {
    /* `_validar_responsavel`, no servidor, exige que o responsável seja
     * membro do subgrupo. A lista vinha do grupo inteiro, então escolher
     * alguém de fora dava "Responsável não é membro do subgrupo" -- o mesmo
     * defeito da coluna, num campo diferente. */
    await abrirNovaTarefaETrocarPara("Trabalhista");

    await waitFor(() =>
      expect(mocks.listarMembrosDoSubgrupo).toHaveBeenCalledWith("sg-trab"),
    );
  });
});

describe("responsável que saiu do subgrupo", () => {
  it("continua aparecendo ao editar, em vez de ser apagado em silêncio", async () => {
    /* ⚠️ Risco criado pela própria correção acima. A lista de responsáveis
     * passou a ser a do subgrupo -- que é o recorte certo -- mas quem foi
     * removido do subgrupo depois de receber a tarefa some dela. Sem este
     * guard, abrir a tarefa mostraria "Sem responsável" e qualquer salvamento
     * gravaria `null`: a atribuição sumiria sem ninguém mandar. */
    mocks.detalhesTarefa.mockResolvedValue({
      ...TAREFA_DO_LINK,
      responsavel_id: "quem.saiu@x.com",
    });
    mocks.listarMembrosDoSubgrupo.mockResolvedValue({
      membros: [{ email: "ana@x.com", apelido: "Ana" }],
    });

    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });

    const modal = await screen.findByRole("dialog");
    expect(await within(modal).findByText("quem.saiu@x.com")).toBeInTheDocument();
  });
});

describe("nome de quem pode ser responsável", () => {
  it("mostra o apelido que a rota do subgrupo devolve", async () => {
    /* A rota `/subgrupos/{id}/membros` passou a devolver o apelido junto do
     * e-mail. Antes vinha só o e-mail, e DOIS lugares (este modal e a aba
     * de Membros do Subgrupo) pediam a lista do grupo inteiro só pra
     * traduzir e-mail em nome -- a mesma volta, feita duas vezes. */
    const user = userEvent.setup();
    mocks.listarMembrosDoSubgrupo.mockResolvedValue({
      membros: [{ email: "joao@x.com", apelido: "João Meireles" }],
    });

    montar();
    await user.click(await screen.findByRole("button", { name: /Nova tarefa/ }));
    const modal = await screen.findByRole("dialog");
    await within(modal).findByText("Triagem");
    await user.click(within(modal).getByText("Sem responsável"));

    expect(await screen.findByRole("option", { name: "João Meireles" })).toBeInTheDocument();
  });

  it("cai no e-mail quando a pessoa não tem apelido", async () => {
    // Quem nunca definiu apelido não pode sumir do seletor: o e-mail ainda
    // identifica, e some-lo deixaria a tarefa sem como ser atribuída a ela.
    const user = userEvent.setup();
    mocks.listarMembrosDoSubgrupo.mockResolvedValue({
      membros: [{ email: "sem.apelido@x.com", apelido: null }],
    });

    montar();
    await user.click(await screen.findByRole("button", { name: /Nova tarefa/ }));
    const modal = await screen.findByRole("dialog");
    await within(modal).findByText("Triagem");
    await user.click(within(modal).getByText("Sem responsável"));

    expect(await screen.findByRole("option", { name: "sem.apelido@x.com" })).toBeInTheDocument();
  });

  it("oferece responsáveis mesmo pra quem é `user`", async () => {
    /* 🔴 A rota exigia `manager`, então pra um `user` o seletor vinha vazio
     * e ele não conseguia atribuir tarefa A NINGUÉM -- nem a si mesmo. Ficava
     * fora de "minhas tarefas", dos cartões da Área de trabalho e do lembrete
     * de prazo, que sai pro responsável. O servidor sempre aceitou a
     * atribuição; faltava a tela ter como listar os nomes. */
    const user = userEvent.setup();
    mocks.papelAtende.mockReturnValue(false); // papel `user`
    mocks.listarMembrosDoSubgrupo.mockResolvedValue({
      membros: [{ email: "eu@x.com", apelido: "Eu Mesmo" }],
    });

    montar();
    await user.click(await screen.findByRole("button", { name: /Nova tarefa/ }));
    const modal = await screen.findByRole("dialog");
    await within(modal).findByText("Triagem");
    await user.click(within(modal).getByText("Sem responsável"));

    expect(await screen.findByRole("option", { name: "Eu Mesmo" })).toBeInTheDocument();
  });
});

describe("subgrupo sem quadro montado", () => {
  /* 🔴 Estado alcançável, não hipotético: subgrupo gravado fora de
   * `subgrupos_service.criar` nasce sem coluna nenhuma -- foi o que
   * aconteceu na semeadura do ambiente local, e a tela abria EM BRANCO no
   * primeiro clique de quem subia o ambiente. Sem colunas, sem mensagem,
   * sem erro: com cara de sistema quebrado.
   *
   * O par admin/não-admin importa porque a SAÍDA é diferente: criar coluna é
   * `admin` no servidor. Uma mensagem só ou mandaria o admin procurar outra
   * pessoa, ou mandaria o `user` para um botão que ele não tem. */

  beforeEach(() => {
    mocks.listarQuadro.mockResolvedValue({ colunas: [] });
  });

  it("🔴 não fica em branco -- diz o que houve", async () => {
    montar();
    expect(await screen.findByText(/ainda não tem quadro/)).toBeInTheDocument();
  });

  it("pro admin, oferece MONTAR o quadro", async () => {
    mocks.papelAtende.mockReturnValue(true);
    montar();

    await screen.findByText(/ainda não tem quadro/);
    /* Dois "Editar quadro" na tela: o do cabeçalho e o do estado vazio. O
       que importa é que o caminho exista -- e ele existe nos dois. */
    expect(screen.getAllByRole("button", { name: "Editar quadro" }).length).toBeGreaterThan(0);
  });

  it("pra quem NÃO é admin, diz a quem pedir", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montar();

    expect(await screen.findByText(/Peça a um admin para criar as colunas/)).toBeInTheDocument();
    // E não oferece um botão que a API vai negar.
    expect(screen.queryByRole("button", { name: "Editar quadro" })).not.toBeInTheDocument();
  });

  it("🔴 não oferece 'Nova tarefa' -- não há onde a tarefa cair", async () => {
    /* O modal até abriria, mas `colunaEscolhida` fica vazia e "Salvar" nasce
       travado: um formulário inteiro que não conclui. */
    montar();
    await screen.findByText(/ainda não tem quadro/);
    expect(screen.queryByRole("button", { name: /Nova tarefa/ })).not.toBeInTheDocument();
  });

  it("o par: COM colunas, o quadro desenha e 'Nova tarefa' volta", async () => {
    /* Sem este par, um bug que escondesse o quadro sempre passaria igual. */
    mocks.listarQuadro.mockResolvedValue({ colunas: COLUNAS_CIVEL });
    montar();

    expect(await screen.findByRole("button", { name: /Nova tarefa/ })).toBeInTheDocument();
    expect(screen.queryByText(/ainda não tem quadro/)).not.toBeInTheDocument();
  });

  it("🔴 ESCONDE a lista de pessoas do FILTRO de quem é `user`", async () => {
    /* `GET /grupos/membros` (o catálogo do GRUPO) tem piso `manager` e
       responde 403 pra `user` -- e uma opção que falha é pior que uma
       ausente.

       ⚠️ NÃO confundir com `GET /subgrupos/{id}/membros`, que o teste acima
       exercita: aquele é piso `user` de propósito, e é o que faz um `user`
       conseguir ATRIBUIR tarefa. Aqui é só o FILTRO da barra, e a pílula
       continua existindo -- "Todas as pessoas" e "Sem responsável" não
       dependem do catálogo. */
    const user = userEvent.setup();
    mocks.papelAtende.mockReturnValue(false);
    renderComProviders(<MemoryRouter><KanbanPage /></MemoryRouter>);
    await screen.findByText("Todas as pessoas");

    await user.click(screen.getByText("Todas as pessoas"));
    expect(await screen.findByRole("option", { name: "Sem responsável" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Ana" })).not.toBeInTheDocument();
  });

  it("oferece a lista de pessoas no filtro pra manager+", async () => {
    const user = userEvent.setup();
    mocks.papelAtende.mockReturnValue(true);
    renderComProviders(<MemoryRouter><KanbanPage /></MemoryRouter>);
    await screen.findByText("Todas as pessoas");

    await user.click(screen.getByText("Todas as pessoas"));
    expect(await screen.findByRole("option", { name: "Ana" })).toBeInTheDocument();
  });
});

// ── 🔴 o caso-manchete da guarda de descarte ──────────────────────────────

describe("guarda de descarte na tarefa", () => {
  const perguntou = () => screen.queryByText("Sair sem salvar?") !== null;

  it("🔴 abrir uma tarefa pelo link, olhar e FECHAR não pergunta nada", async () => {
    /* O caso que o requisito nomeou e o que mais fácil se erra. A tarefa abre
       com tudo preenchido -- título, data, coluna, prioridade, responsável --,
       e nada disso é trabalho da pessoa: é o registro que já existe. Se a
       guarda comparasse com "formulário vazio", ela perguntaria no gesto mais
       comum de todos: abrir para consultar e sair. */
    const user = userEvent.setup();
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });
    await screen.findByDisplayValue("Protocolar recurso");

    await user.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
  });

  it("🔴 e a COLUNA que chega do quadro também não conta", async () => {
    /* O par fino: `colunaEscolhida` é derivada e só encontra a coluna depois
       que o quadro responde -- até lá é `""`. Sem o `resemear`, essa chegada
       sozinha marcaria a tarefa como alterada. A espera abaixo garante que o
       quadro já resolveu antes do Escape. */
    const user = userEvent.setup();
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });
    await screen.findByDisplayValue("Protocolar recurso");
    await screen.findByLabelText(/^Status/);

    await user.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
  });

  it("mexer no título pergunta, e diz que é EDIÇÃO", async () => {
    const user = userEvent.setup();
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });
    const titulo = await screen.findByDisplayValue("Protocolar recurso");

    await user.type(titulo, " urgente");
    await user.keyboard("{Escape}");

    expect(perguntou()).toBe(true);
    expect(screen.getByRole("button", { name: "Continuar editando" })).toBeInTheDocument();
  });

  it("mexer e DESFAZER volta a fechar direto", async () => {
    const user = userEvent.setup();
    montar({ subgrupoId: "sg-trab", tarefaId: "t-atrasada" });
    const titulo = await screen.findByDisplayValue("Protocolar recurso");

    await user.type(titulo, "X");
    await user.type(titulo, "{Backspace}");
    await user.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
  });
});

describe("seleção em lote no Kanban (Fase 5 do PLANO_ACOES_EM_LOTE)", () => {
  /** Três cartões em DUAS colunas: é o que separa "a contagem é do quadro"
   * de "a contagem é da coluna". */
  const NO_QUADRO = [
    { subgrupo_id: "sg-trab", tarefa_id: "k1", titulo: "Elaborar defesa", data: "2026-09-10",
      coluna_id: "c1", prioridade: "Alta", responsavel_id: null },
    { subgrupo_id: "sg-trab", tarefa_id: "k2", titulo: "Reunir provas", data: "2026-09-11",
      coluna_id: "c1", prioridade: "Média", responsavel_id: "ana@x.com", responsavel_nome: "Ana" },
    { subgrupo_id: "sg-trab", tarefa_id: "k3", titulo: "Fechar acordo", data: "2026-09-12",
      coluna_id: "c2", prioridade: "Baixa", responsavel_id: null },
  ];

  async function entrar() {
    const usuario = userEvent.setup();
    lembrarTrabalhista();
    mocks.listarTarefas.mockResolvedValue({ tarefas: NO_QUADRO, total: 3, total_paginas: 1 });
    montar();
    await screen.findByText("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    return usuario;
  }

  it("🔴 o cartão deixa de ser BOTÃO e vira a caixa", async () => {
    /* Caixa de marcar dentro de conteúdo interativo é HTML inválido, e o
       mesmo apertar-e-mover significaria marcar E arrastar. */
    await entrar();
    expect(
      await screen.findByRole("checkbox", { name: "Selecionar Elaborar defesa" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Elaborar defesa/ })).not.toBeInTheDocument();
  });

  it("🔴 a barra DIZ que o arraste está desligado", async () => {
    /* É o que a seleção custa nesta tela. Sem a frase, a pessoa descobre
       tentando arrastar e conclui que o quadro travou. */
    await entrar();
    expect(
      screen.getByText("O arraste fica desligado enquanto você seleciona."),
    ).toBeInTheDocument();
  });

  it("⚠️ o par: fora do modo, a barra e a frase não existem", async () => {
    lembrarTrabalhista();
    mocks.listarTarefas.mockResolvedValue({ tarefas: NO_QUADRO, total: 3, total_paginas: 1 });
    montar();
    await screen.findByText("Elaborar defesa");
    expect(screen.queryByText(/arraste fica desligado/)).not.toBeInTheDocument();
    expect(screen.queryByText(/selecionadas/)).not.toBeInTheDocument();
  });

  it("🔴 a contagem é do QUADRO inteiro, não de uma coluna", async () => {
    /* São três cartões em duas colunas. Uma barra por coluna contaria dois e
       um; a barra do quadro conta três -- e marcar cartões de colunas
       diferentes na mesma leva é metade da razão de existir a seleção aqui. */
    const usuario = await entrar();
    expect(screen.getByText("0 de 3 selecionadas")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: /Selecionar todas as 3/ }));
    expect(screen.getByText("3 de 3 selecionadas")).toBeInTheDocument();
  });

  it("⚠️ trocar de QUADRO SAI do modo -- o universo é outro", async () => {
    /* Diferente de trocar filtro, que só limpa: o quadro do Cível não tem
       nada a ver com o do Trabalhista, e uma barra dizendo "0 de N" sobre
       cartões que ninguém escolheu é moldura sem conteúdo. */
    const usuario = await entrar();
    await usuario.click(screen.getByRole("button", { name: /Selecionar todas as 3/ }));
    expect(screen.getByText("3 de 3 selecionadas")).toBeInTheDocument();

    await usuario.click(screen.getByText("Trabalhista"));
    await usuario.click(await screen.findByRole("option", { name: "Cível" }));
    await waitFor(() => expect(screen.queryByText(/selecionadas/)).not.toBeInTheDocument());
  });

  it("⚠️ a busca LIMPA a seleção, sem sair do modo", async () => {
    /* A contagem passaria a falar de cartão que saiu da tela, e o lote
       apagaria o que ninguém vê. */
    const usuario = await entrar();
    await usuario.click(screen.getByRole("button", { name: /Selecionar todas as 3/ }));
    await usuario.type(screen.getByLabelText(/Pesquisar cartão/), "defesa");
    await waitFor(() => expect(screen.getByText(/^0 de/)).toBeInTheDocument());
  });

  it("clicar no CARTÃO inteiro marca -- ele é o rótulo da caixa", async () => {
    /* É onde a pessoa clica: a caixa tem 16px, o cartão tem a largura da
       coluna. E marcar UMA vez -- sem o `preventDefault` do `onClick` o
       Chakra alterna junto e o clique se anula. */
    const usuario = await entrar();
    await usuario.click(screen.getByText("Elaborar defesa"));
    expect(screen.getByText("1 de 3 selecionadas")).toBeInTheDocument();
  });

  it("Shift+clique no cartão marca o intervalo, ATRAVESSANDO colunas", async () => {
    /* O modificador só existe no evento de CLIQUE. E o intervalo segue a
       ordem do QUADRO: "Elaborar defesa" e "Reunir provas" estão na primeira
       coluna, "Fechar acordo" na segunda -- as três entram. */
    const usuario = await entrar();
    await usuario.click(screen.getByText("Elaborar defesa"));
    await usuario.keyboard("{Shift>}");
    await usuario.click(screen.getByText("Fechar acordo"));
    await usuario.keyboard("{/Shift}");
    expect(screen.getByText("3 de 3 selecionadas")).toBeInTheDocument();
  });

  it("🔴 excluir manda o `responsavel_id` que a TELA VIU", async () => {
    /* É ele que a guarda do lote compara. Sem ele no fio, a proteção some --
       e o par de baixo existe porque `null` fixo passaria neste teste. */
    const usuario = await entrar();
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Reunir provas" }));
    await usuario.click(screen.getByRole("button", { name: "Excluir 1" }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 1 tarefa" }));

    await waitFor(() => expect(mocks.removerTarefasEmLote).toHaveBeenCalled());
    expect(mocks.removerTarefasEmLote.mock.calls[0][0]).toEqual([
      { subgrupo_id: "sg-trab", tarefa_id: "k2", responsavel_id: "ana@x.com" },
    ]);
  });

  it("🔴 e leva `null` de verdade quando o cartão não tem dono", async () => {
    const usuario = await entrar();
    await usuario.click(screen.getByRole("checkbox", { name: "Selecionar Elaborar defesa" }));
    await usuario.click(screen.getByRole("button", { name: "Excluir 1" }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 1 tarefa" }));

    await waitFor(() => expect(mocks.removerTarefasEmLote).toHaveBeenCalled());
    expect(mocks.removerTarefasEmLote.mock.calls[0][0]).toEqual([
      { subgrupo_id: "sg-trab", tarefa_id: "k1", responsavel_id: null },
    ]);
  });

  it("🔴 quem NÃO é manager não vê a entrada", async () => {
    /* Esconder não é a proteção -- a rota devolve 403. É para não oferecer o
       que ela vai negar. */
    mocks.papelAtende.mockReturnValue(false);
    lembrarTrabalhista();
    mocks.listarTarefas.mockResolvedValue({ tarefas: NO_QUADRO, total: 3, total_paginas: 1 });
    montar();
    await screen.findByText("Elaborar defesa");
    expect(screen.queryByRole("button", { name: "Selecionar" })).not.toBeInTheDocument();
  });

  it("⚠️ sem cartão nenhum não há o que selecionar, e a entrada some", async () => {
    lembrarTrabalhista();
    mocks.listarTarefas.mockResolvedValue({ tarefas: [], total: 0, total_paginas: 0 });
    montar();
    await screen.findByText("A Fazer");
    expect(screen.queryByRole("button", { name: "Selecionar" })).not.toBeInTheDocument();
  });
});

describe("ações reversíveis do lote no Kanban (Fase 8 do PLANO_ACOES_EM_LOTE)", () => {
  /** Dois cartões em A Fazer e um em Concluído -- é o que deixa o Desfazer
   * provar que volta cada um para ONDE saiu, e que a já concluída não volta. */
  const NO_QUADRO = [
    { subgrupo_id: "sg-trab", tarefa_id: "k1", titulo: "Elaborar defesa", data: "2026-09-10",
      coluna_id: "c1", prioridade: "Alta", responsavel_id: null },
    { subgrupo_id: "sg-trab", tarefa_id: "k2", titulo: "Reunir provas", data: "2026-09-11",
      coluna_id: "c1", prioridade: "Média", responsavel_id: "ana@x.com", responsavel_nome: "Ana" },
    { subgrupo_id: "sg-trab", tarefa_id: "k3", titulo: "Fechar acordo", data: "2026-09-12",
      coluna_id: "c2", prioridade: "Baixa", responsavel_id: null },
  ];
  const K1 = { subgrupo_id: "sg-trab", tarefa_id: "k1", responsavel_id: null };
  const K2 = { subgrupo_id: "sg-trab", tarefa_id: "k2", responsavel_id: "ana@x.com" };

  async function entrarEMarcar(...titulos: string[]) {
    const usuario = userEvent.setup();
    lembrarTrabalhista();
    mocks.listarTarefas.mockResolvedValue({ tarefas: NO_QUADRO, total: 3, total_paginas: 1 });
    montar();
    await screen.findByText("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Selecionar" }));
    for (const t of titulos) {
      await usuario.click(screen.getByRole("checkbox", { name: `Selecionar ${t}` }));
    }
    return usuario;
  }

  it("🔴 concluir abre a confirmação REVERSÍVEL: botão primário, sem 'não pode ser desfeita'", async () => {
    /* Ícone de lixo e aviso de irreversível numa ação que se desfaz mentem --
       e assustam a pessoa a não usar o que é seguro. */
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByRole("button", { name: "Concluir 2" })).toHaveAttribute("data-variante", "primario");
    expect(within(dialogo).queryByText("Essa ação não pode ser desfeita.")).not.toBeInTheDocument();
    expect(within(dialogo).getByText(/Dá para reabrir depois/)).toBeInTheDocument();
  });

  it("concluir manda as MARCADAS e FICA no modo, com Desfazer no aviso", async () => {
    /* Ação reversível não sai do modo: distribuir é multi-passo, e refazer a
       seleção a cada escolha é o que ninguém faz. */
    mocks.concluirTarefasEmLote.mockResolvedValue({ concluidas: 2, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));

    expect(await screen.findByText("2 tarefas concluídas.")).toBeInTheDocument();
    expect(mocks.concluirTarefasEmLote).toHaveBeenCalledWith([K1, K2]);
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeInTheDocument();
    /* Continua de pé, e as duas que já foram saíram do conjunto. */
    expect(screen.getByText("0 de 3 selecionadas")).toBeInTheDocument();
  });

  it("🔴 Desfazer devolve cada uma à coluna de ONDE saiu", async () => {
    mocks.concluirTarefasEmLote.mockResolvedValue({ concluidas: 2, ignoradas: [], recusadas: [] });
    mocks.alterarStatusEmLote.mockResolvedValue({ movidas: 2, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));
    await usuario.click(await screen.findByRole("button", { name: "Desfazer" }));

    expect(await screen.findByText("Desfeito.")).toBeInTheDocument();
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledTimes(1);
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K1, K2], "c1");
  });

  it("⚠️ a que JÁ estava concluída não volta no Desfazer", async () => {
    /* O servidor a devolve em `ignoradas`. Desfazer sobre as enviadas a
       tiraria da conclusão -- um estado que ninguém pediu. */
    mocks.concluirTarefasEmLote.mockResolvedValue({
      concluidas: 1,
      ignoradas: [{ subgrupo_id: "sg-trab", tarefa_id: "k3", motivo: "ja_concluida" }],
      recusadas: [],
    });
    mocks.alterarStatusEmLote.mockResolvedValue({ movidas: 1, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Fechar acordo");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));
    expect(await screen.findByText("1 tarefa concluída. 1 já estava concluída.")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Desfazer" }));

    await screen.findByText("Desfeito.");
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledTimes(1);
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K1], "c1");
  });

  it("⚠️ o par: excluir NÃO oferece Desfazer, e sai do modo", async () => {
    mocks.removerTarefasEmLote.mockResolvedValue({ removidas: 1, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Excluir 1" }));
    await usuario.click(await screen.findByRole("button", { name: "Excluir 1 tarefa" }));

    expect(await screen.findByText("1 tarefa excluída.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Selecionar" })).toBeInTheDocument());
  });

  it("painel de status: as colunas do quadro, a conclusão marcada e quantas já estão lá", async () => {
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));

    expect(await screen.findByRole("menuitem", { name: /A Fazer.*2 já estão aqui/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Concluído.*· conclusão/ })).toBeInTheDocument();
  });

  it("🔴 alterar status manda a coluna escolhida -- e a frase segue o botão, sem 'movida'", async () => {
    mocks.alterarStatusEmLote.mockResolvedValue({ movidas: 2, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));

    const aviso = await screen.findByText("2 tarefas agora estão em “Arquivado”.");
    expect(aviso.textContent).not.toMatch(/movid/i);
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K1, K2], "c3");
  });

  it("painel de pessoas: cada uma diz, ANTES da escolha, quantas ficariam de fora", async () => {
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [
        { email: "ana@x.com", apelido: "Ana", subgrupos: ["sg-trab"] },
        { email: "bia@x.com", apelido: "Bia", subgrupos: ["outro"] },
      ],
    });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));

    expect(await screen.findByRole("menuitem", { name: /Ana.*Membro de todos os subgrupos da seleção/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Bia.*2 ficarão de fora — não é membro/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Ninguém — devolver ao pool" })).toBeInTheDocument();
  });

  it("🔴 atribuir FICA no modo, e o Desfazer devolve cada uma ao dono de onde saiu", async () => {
    /* A guarda do Desfazer é o responsável que a tela vê AGORA -- a Bia. E
       cada grupo volta ao seu: k1 ao pool, k2 à Ana. */
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [{ email: "bia@x.com", apelido: "Bia", subgrupos: ["sg-trab"] }],
    });
    mocks.atribuirTarefasEmLote.mockResolvedValue({ atribuidas: 2, impedidas: [], ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Bia/ }));

    expect(await screen.findByText("2 tarefas atribuídas a Bia.")).toBeInTheDocument();
    expect(mocks.atribuirTarefasEmLote).toHaveBeenCalledWith([K1, K2], "bia@x.com");
    expect(screen.getByText("0 de 3 selecionadas")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Desfazer" }));
    await screen.findByText("Desfeito.");
    expect(mocks.atribuirTarefasEmLote).toHaveBeenCalledTimes(3);
    expect(mocks.atribuirTarefasEmLote).toHaveBeenCalledWith([{ ...K1, responsavel_id: "bia@x.com" }], null);
    expect(mocks.atribuirTarefasEmLote).toHaveBeenCalledWith([{ ...K2, responsavel_id: "bia@x.com" }], "ana@x.com");
  });

  it("⚠️ devolver ao pool manda `null` -- e diz isso na frase", async () => {
    mocks.atribuirTarefasEmLote.mockResolvedValue({ atribuidas: 1, impedidas: [], ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: "Ninguém — devolver ao pool" }));

    expect(await screen.findByText("1 tarefa devolvida ao pool.")).toBeInTheDocument();
    expect(mocks.atribuirTarefasEmLote).toHaveBeenCalledWith([K2], null);
  });

  it("⚠️ com uma ação a caminho, as três travam -- um segundo clique mandaria o lote duas vezes", async () => {
    mocks.alterarStatusEmLote.mockReturnValue(new Promise(() => {}));
    const usuario = await entrarEMarcar("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Concluir" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Atribuir a…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Alterar status…" })).toBeDisabled();
  });

  it("🔴 Desfazer com origens DIFERENTES faz uma chamada por coluna de onde cada uma saiu", async () => {
    /* Achado por mutação: agrupar tudo numa origem só passava em todos os
       testes, porque nenhum desfazia tarefas vindas de colunas diferentes. A
       rota de status aceita UMA coluna por chamada -- sem o agrupamento,
       "Fechar acordo" voltaria para A Fazer em vez de Concluído. */
    mocks.alterarStatusEmLote.mockResolvedValue({ movidas: 2, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Fechar acordo");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));
    await usuario.click(await screen.findByRole("button", { name: "Desfazer" }));

    await screen.findByText("Desfeito.");
    const K3 = { subgrupo_id: "sg-trab", tarefa_id: "k3", responsavel_id: null };
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledTimes(3);
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K1, K3], "c3");
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K1], "c1");
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K3], "c2");
  });

  it("⚠️ concluir com sucesso FECHA a confirmação -- ela não fica perguntando sobre o que já foi", async () => {
    /* Achado por mutação: nenhum teste olhava o diálogo depois do sucesso. */
    mocks.concluirTarefasEmLote.mockResolvedValue({ concluidas: 2, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));

    await screen.findByText("2 tarefas concluídas.");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("🔴 a RECUSADA não volta no Desfazer, e CONTINUA marcada para uma nova tentativa", async () => {
    /* Ela mudou de dono no meio do caminho e não foi tocada. Desfazê-la
       mexeria no trabalho de outra pessoa; e tirá-la da seleção obrigaria a
       procurá-la de novo. */
    mocks.concluirTarefasEmLote.mockResolvedValue({
      concluidas: 1,
      ignoradas: [],
      recusadas: [{ subgrupo_id: "sg-trab", tarefa_id: "k2", motivo: "responsavel_mudou", responsavel_atual: "bia@x.com" }],
    });
    mocks.alterarStatusEmLote.mockResolvedValue({ movidas: 1, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));

    expect(
      await screen.findByText("1 tarefa concluída. 1 ficou: o responsável mudou enquanto você escolhia."),
    ).toBeInTheDocument();
    expect(screen.getByText("1 de 3 selecionadas")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Desfazer" }));

    await screen.findByText("Desfeito.");
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledTimes(1);
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledWith([K1], "c1");
  });

  it("🔴 a IMPEDIDA não volta no Desfazer, e CONTINUA marcada para outra pessoa", async () => {
    /* Não foi atribuída (a pessoa não é membro do subgrupo dela). O gesto
       natural é escolher outra pessoa para ela -- e para isso ela precisa
       continuar marcada. */
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [{ email: "bia@x.com", apelido: "Bia", subgrupos: ["sg-trab"] }],
    });
    mocks.atribuirTarefasEmLote.mockResolvedValue({
      atribuidas: 1,
      impedidas: [{ subgrupo_id: "sg-trab", tarefa_id: "k2", motivo: "nao_e_membro", subgrupo_nome: "Trabalhista" }],
      ignoradas: [],
      recusadas: [],
    });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Bia/ }));

    expect(
      await screen.findByText("1 tarefa atribuída a Bia. 1 ficou de fora: não é membro de Trabalhista."),
    ).toBeInTheDocument();
    expect(screen.getByText("1 de 3 selecionadas")).toBeInTheDocument();
    await usuario.click(screen.getByRole("button", { name: "Desfazer" }));

    await screen.findByText("Desfeito.");
    expect(mocks.atribuirTarefasEmLote).toHaveBeenCalledTimes(2);
    expect(mocks.atribuirTarefasEmLote).toHaveBeenLastCalledWith([{ ...K1, responsavel_id: "bia@x.com" }], null);
  });

  it("⚠️ quando NADA foi tocado, o aviso não oferece Desfazer -- e as marcadas continuam marcadas", async () => {
    /* Um Desfazer sem nada a desfazer é um botão que mente. */
    mocks.concluirTarefasEmLote.mockResolvedValue({
      concluidas: 0,
      ignoradas: [
        { subgrupo_id: "sg-trab", tarefa_id: "k1", motivo: "ja_concluida" },
        { subgrupo_id: "sg-trab", tarefa_id: "k2", motivo: "ja_concluida" },
      ],
      recusadas: [],
    });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));

    expect(await screen.findByText("0 tarefas concluídas. 2 já estavam concluídas.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
    expect(screen.getByText("2 de 3 selecionadas")).toBeInTheDocument();
  });

  it("🔴 concluir FALHANDO: fecha a confirmação, avisa, e as marcadas continuam marcadas", async () => {
    /* Nada mudou no servidor. Modal aberto sobre o erro faria clicar de novo
       achando que o botão falhou; e perder a seleção obrigaria a refazê-la para
       tentar outra vez. */
    mocks.concluirTarefasEmLote.mockRejectedValue(new Error("rede"));
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));

    expect(await screen.findByText("Não foi possível concluir.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("2 de 3 selecionadas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
  });

  it("⚠️ alterar status FALHANDO: avisa, sem Desfazer, e as marcadas continuam marcadas", async () => {
    mocks.alterarStatusEmLote.mockRejectedValue(new Error("rede"));
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));

    expect(await screen.findByText("Não foi possível alterar o status.")).toBeInTheDocument();
    expect(screen.getByText("2 de 3 selecionadas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
  });

  it("⚠️ atribuir FALHANDO: avisa, sem Desfazer, e as marcadas continuam marcadas", async () => {
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [{ email: "bia@x.com", apelido: "Bia", subgrupos: ["sg-trab"] }],
    });
    mocks.atribuirTarefasEmLote.mockRejectedValue(new Error("rede"));
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Bia/ }));

    expect(await screen.findByText("Não foi possível atribuir.")).toBeInTheDocument();
    expect(screen.getByText("2 de 3 selecionadas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
  });

  it("🔴 o Desfazer FALHANDO avisa -- e nunca diz 'Desfeito.'", async () => {
    mocks.concluirTarefasEmLote.mockResolvedValue({ concluidas: 2, ignoradas: [], recusadas: [] });
    mocks.alterarStatusEmLote.mockRejectedValue(new Error("rede"));
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 2" }));
    await usuario.click(await screen.findByRole("button", { name: "Desfazer" }));

    expect(await screen.findByText("Não foi possível desfazer.")).toBeInTheDocument();
    expect(screen.queryByText("Desfeito.")).not.toBeInTheDocument();
  });

  it("⚠️ Desfazer em SÉRIE: se o segundo grupo falha, avisa -- e o primeiro já tinha voltado", async () => {
    /* As chamadas inversas vão uma a uma. A falha no meio vira aviso de erro,
       e "Desfeito." mentiria sobre a metade que não voltou. */
    mocks.alterarStatusEmLote
      .mockResolvedValueOnce({ movidas: 2, ignoradas: [], recusadas: [] })
      .mockResolvedValueOnce({ movidas: 1, ignoradas: [], recusadas: [] })
      .mockRejectedValueOnce(new Error("rede"));
    const usuario = await entrarEMarcar("Elaborar defesa", "Fechar acordo");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));
    await usuario.click(await screen.findByRole("button", { name: "Desfazer" }));

    expect(await screen.findByText("Não foi possível desfazer.")).toBeInTheDocument();
    expect(mocks.alterarStatusEmLote).toHaveBeenCalledTimes(3);
    expect(screen.queryByText("Desfeito.")).not.toBeInTheDocument();
  });

  it("⚠️ status sem nada tocado (todas já estavam lá) não oferece Desfazer", async () => {
    mocks.alterarStatusEmLote.mockResolvedValue({
      movidas: 0,
      ignoradas: [
        { subgrupo_id: "sg-trab", tarefa_id: "k1", motivo: "ja_na_coluna" },
        { subgrupo_id: "sg-trab", tarefa_id: "k2", motivo: "ja_na_coluna" },
      ],
      recusadas: [],
    });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /A Fazer/ }));

    expect(await screen.findByText("0 tarefas agora estão em “A Fazer”. 2 já estavam.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
  });

  it("⚠️ atribuir sem nada tocado (todas impedidas) não oferece Desfazer, e ficam marcadas", async () => {
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
      membros: [{ email: "bia@x.com", apelido: "Bia", subgrupos: [] }],
    });
    mocks.atribuirTarefasEmLote.mockResolvedValue({
      atribuidas: 0,
      impedidas: [
        { subgrupo_id: "sg-trab", tarefa_id: "k1", motivo: "nao_e_membro", subgrupo_nome: "Trabalhista" },
        { subgrupo_id: "sg-trab", tarefa_id: "k2", motivo: "nao_e_membro", subgrupo_nome: "Trabalhista" },
      ],
      ignoradas: [],
      recusadas: [],
    });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Bia/ }));

    expect(
      await screen.findByText("0 tarefas atribuídas a Bia. 2 ficaram de fora: não é membro de Trabalhista."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).not.toBeInTheDocument();
    expect(screen.getByText("2 de 3 selecionadas")).toBeInTheDocument();
  });

  it("⚠️ painel de pessoas CARREGANDO diz isso -- e o pool continua oferecido", async () => {
    mocks.listarTodosOsMembrosDoGrupo.mockReturnValue(new Promise(() => {}));
    const usuario = await entrarEMarcar("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Carregando…")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Ninguém — devolver ao pool" })).toBeInTheDocument();
  });

  it("🔴 painel de pessoas FALHANDO diz que falhou -- e não vira uma lista vazia", async () => {
    /* Lista vazia diria "não há ninguém para receber": a mentira que o estado
       de erro existe para evitar. */
    mocks.listarTodosOsMembrosDoGrupo.mockRejectedValue(new Error("rede"));
    const usuario = await entrarEMarcar("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Atribuir a…" }));

    const menu = await screen.findByRole("menu");
    expect(await within(menu).findByText("Não foi possível carregar as pessoas.")).toBeInTheDocument();
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(1);
  });

  it("🔴 o erro DO SERVIDOR chega ao aviso com as palavras dele -- não a frase genérica", async () => {
    /* O caso real: um 400 de regra. A frase genérica esconderia o motivo que o
       servidor já escreveu para a pessoa. */
    mocks.alterarStatusEmLote.mockRejectedValue(
      new ApiError("Todas as tarefas precisam ser do mesmo subgrupo para mudar de status", 400),
    );
    const usuario = await entrarEMarcar("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));

    expect(
      await screen.findByText("Todas as tarefas precisam ser do mesmo subgrupo para mudar de status"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Não foi possível alterar o status.")).not.toBeInTheDocument();
  });

  it("⚠️ o 403 do servidor no Desfazer também chega com as palavras dele", async () => {
    /* Alguém pode ter perdido acesso ao subgrupo entre a ação e o Desfazer. */
    mocks.concluirTarefasEmLote.mockResolvedValue({ concluidas: 1, ignoradas: [], recusadas: [] });
    mocks.alterarStatusEmLote.mockRejectedValue(new ApiError("Sem permissão neste subgrupo", 403));
    const usuario = await entrarEMarcar("Elaborar defesa");
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    await usuario.click(await screen.findByRole("button", { name: "Concluir 1" }));
    await usuario.click(await screen.findByRole("button", { name: "Desfazer" }));

    expect(await screen.findByText("Sem permissão neste subgrupo")).toBeInTheDocument();
    expect(screen.queryByText("Desfeito.")).not.toBeInTheDocument();
  });

  it("⚠️ alterar status com sucesso FICA no modo, e as que mudaram SAEM da seleção", async () => {
    /* Achado por mutação: nenhum teste olhava a seleção depois de mudar o
       status. Sem tirar as tocadas, "Excluir 2" continuaria apontando para
       tarefas que a pessoa já tratou -- e um segundo clique agiria de novo. */
    mocks.alterarStatusEmLote.mockResolvedValue({ movidas: 2, ignoradas: [], recusadas: [] });
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");
    await usuario.click(screen.getByRole("button", { name: "Alterar status…" }));
    await usuario.click(await screen.findByRole("menuitem", { name: /Arquivado/ }));

    await screen.findByText("2 tarefas agora estão em “Arquivado”.");
    expect(screen.getByText("0 de 3 selecionadas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desfazer" })).toBeInTheDocument();
  });

  it("🔴 as DUAS confirmações dizem QUAIS tarefas, e não só quantas", async () => {
    /* Uma com a lista e a outra sem, lado a lado, fariam a pessoa procurar a
       diferença que não existe. */
    const usuario = await entrarEMarcar("Elaborar defesa", "Reunir provas");

    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    let dialogo = await screen.findByRole("dialog");
    expect(within(within(dialogo).getByRole("list")).getByText("Elaborar defesa")).toBeInTheDocument();
    expect(within(within(dialogo).getByRole("list")).getByText("Reunir provas")).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await usuario.click(screen.getByRole("button", { name: "Excluir 2" }));
    dialogo = await screen.findByRole("dialog");
    expect(within(within(dialogo).getByRole("list")).getByText("Elaborar defesa")).toBeInTheDocument();
    expect(within(within(dialogo).getByRole("list")).getByText("Reunir provas")).toBeInTheDocument();
  });
});
