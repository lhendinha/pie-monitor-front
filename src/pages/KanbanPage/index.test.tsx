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
  listarMembrosDoSubgrupo: vi.fn(),
  detalhesTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  criarTarefa: vi.fn(),
  papelAtende: vi.fn(),
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
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.criarTarefa.mockResolvedValue({ tarefa_id: "nova" });
  mocks.detalhesTarefa.mockResolvedValue(TAREFA_DO_LINK);
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
});
