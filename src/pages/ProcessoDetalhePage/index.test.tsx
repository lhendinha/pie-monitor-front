import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalhesProcesso: vi.fn(),
  listarTarefas: vi.fn(),
  atualizarProcesso: vi.fn(),
  removerProcesso: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarOpcoesProcesso: vi.fn(),
  /* O modal de tarefa entrou nesta tela em 26/08/2026, e ele fala com o
     mesmo módulo de serviços. Como o `vi.mock` abaixo troca o módulo
     INTEIRO, um export que falte aqui explode na importação -- não no uso. */
  listarQuadro: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  criarTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  removerTarefa: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ProcessoDetalhePage from "./index";

const NUMERO = "00002668720218130559";

const PROCESSO = {
  subgrupo_id: "sg1",
  numero_processo: NUMERO,
  apelido: "Meu processo",
  objeto_assunto: "Cobrança",
  fase_id: "fase-1",
  situacao_id: "sit-1",
  ultima_mov_tipo: "Conclusos para sentença",
  ultima_mov_data: "2026-08-18",
  ultima_verificacao: "2026-08-21T21:42:08Z",
};

/** Revela o endereço atual -- a aba e a movimentação abertas moram nele. */
function Espiao() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{`${pathname}${search}`}</div>;
}

function montar(rota = `/processos/sg1/${NUMERO}`) {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/processos" element={<div>lista de processos</div>} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/processos/:subgrupoId/:numero" element={<ProcessoDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

/** Rota de mentira que revela o alvo do deep link -- é por `state` que o
 * Histórico recebe qual envio abrir, não pela URL. */
function Historico() {
  const { state } = useLocation();
  return <div data-testid="historico">{JSON.stringify(state)}</div>;
}

/** O painel que a aba de nome `nome` comanda.
 *
 * ⚠️ Chega nele pelo `aria-controls` da aba, e não por `getByRole`: painel
 * escondido tem nome acessível VAZIO (ninguém calcula nome de
 * `display: none`), então `getByRole("tabpanel", { name })` nunca acha os
 * inativos -- que são justamente os que estes testes precisam olhar.
 *
 * De quebra, isto verifica a ligação: `aria-controls` apontando pro vazio
 * não aparece na tela, só some do leitor de tela, em silêncio. */
function painel(nome: string) {
  const aba = screen.getByRole("tab", { name: nome });
  const alvo = document.getElementById(aba.getAttribute("aria-controls") ?? "");
  if (!alvo) throw new Error(`A aba "${nome}" aponta pra um painel que não existe.`);
  return alvo;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalhesProcesso.mockResolvedValue({
    numero_processo: NUMERO,
    processos: [PROCESSO],
    comunicacoes: [],
  });
  mocks.listarSubgrupos.mockResolvedValue({ subgrupos: [{ subgrupo_id: "sg1", nome: "Cível" }] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarTarefas.mockResolvedValue({ tarefas: [] });
  mocks.listarQuadro.mockResolvedValue({ colunas: [{ coluna_id: "c1", nome: "A Fazer", ordem: 1 }] });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarOpcoesProcesso.mockImplementation((tipo: string) =>
    Promise.resolve({
      opcoes:
        tipo === "fase"
          ? [{ opcao_id: "fase-1", tipo: "fase", rotulo: "Conhecimento (1º Grau)", ordem: 1, ativo: true }]
          : [{ opcao_id: "sit-1", tipo: "situacao", rotulo: "Aguardando sentença", ordem: 1, ativo: true }],
    }),
  );
});

describe("ProcessoDetalhePage", () => {
  it("carrega o processo a partir da URL -- sem depender da listagem", async () => {
    // É a razão de ser rota: o e-mail de lembrete manda link direto pra cá,
    // e um F5 aqui não tem listagem nenhuma pra herdar dados.
    montar();

    expect(await screen.findByLabelText("Apelido")).toHaveValue("Meu processo");
    expect(mocks.detalhesProcesso).toHaveBeenCalledWith(NUMERO);
  });

  it("mostra subgrupo, situação e fase como etiquetas no cabeçalho", async () => {
    // Escopado ao cabeçalho de propósito: os mesmos rótulos aparecem de
    // novo como valor escolhido nos selects de Fase e Situação logo abaixo.
    montar();

    const titulo = await screen.findByRole("heading", { level: 1 });
    const cabecalho = within(titulo.parentElement!);

    expect(cabecalho.getByText("Cível")).toBeInTheDocument();
    expect(cabecalho.getByText("Aguardando sentença")).toBeInTheDocument();
    expect(cabecalho.getByText("Conhecimento (1º Grau)")).toBeInTheDocument();
  });

  it("salvar envia o PATCH com os campos editados", async () => {
    mocks.atualizarProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    const apelido = await screen.findByLabelText("Apelido");
    await user.clear(apelido);
    await user.type(apelido, "Apelido editado");
    await user.type(screen.getByLabelText("Objeto / assunto"), " extra");

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarProcesso).toHaveBeenCalledWith(
        "sg1",
        NUMERO,
        "Apelido editado",
        expect.objectContaining({ objetoAssunto: "Cobrança extra" }),
      ),
    );
  });

  it("excluir pede confirmação no diálogo do sistema e volta pra listagem", async () => {
    // `window.confirm` não serve: é do navegador, não dá pra pôr o número
    // do processo em destaque nem avisar sobre as tarefas, e em alguns
    // navegadores dá pra silenciá-lo -- aí "Excluir" vira um clique sem
    // volta e sem pergunta.
    mocks.removerProcesso.mockResolvedValue({});
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerProcesso).toHaveBeenCalledWith("sg1", NUMERO));
    expect(await screen.findByText("lista de processos")).toBeInTheDocument();
  });

  it("cancelar no diálogo não chama a API", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    const dialogo = within(await screen.findByRole("dialog"));
    await user.click(dialogo.getByRole("button", { name: "Cancelar" }));

    expect(mocks.removerProcesso).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("o diálogo avisa que as tarefas ficam sem processo", async () => {
    // Elas não somem junto -- e isso é surpresa se ninguém disser.
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        { tarefa_id: "t1", subgrupo_id: "sg1", titulo: "Protocolar réplica", data: "2026-09-01", coluna_id: "c1", prioridade: "Alta" },
      ],
    });
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));

    expect(
      await screen.findByText("1 tarefa vinculada a ele continua existindo, mas fica sem processo."),
    ).toBeInTheDocument();
  });

  it("sem tarefa, o diálogo não mostra aviso nenhum", async () => {
    // Controle: "0 tarefas vinculadas" é ruído.
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: "Excluir" }));
    // Escopado ao diálogo: a página em si diz "Nenhuma tarefa vinculada a
    // este processo" logo atrás dele.
    const dialogo = within(await screen.findByRole("dialog"));

    expect(dialogo.queryByText(/tarefa/)).not.toBeInTheDocument();
  });

  it("'Voltar' devolve pra listagem", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(await screen.findByRole("button", { name: /Voltar/ }));

    expect(await screen.findByText("lista de processos")).toBeInTheDocument();
  });

  it("processo que saiu do subgrupo não mostra formulário vazio", async () => {
    // Acontece quando outra pessoa remove o processo enquanto esta tela
    // está aberta -- ou quando alguém cola um link de subgrupo errado.
    mocks.detalhesProcesso.mockResolvedValue({
      numero_processo: NUMERO,
      processos: [{ ...PROCESSO, subgrupo_id: "outro" }],
      comunicacoes: [],
    });
    montar();

    expect(await screen.findByText("Este processo não está mais neste subgrupo.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Apelido")).not.toBeInTheDocument();
  });

  it("lista as tarefas do processo -- e só as dele", async () => {
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        { tarefa_id: "t1", subgrupo_id: "sg1", titulo: "Protocolar réplica", data: "2026-09-01", coluna_id: "c1", prioridade: "Alta" },
      ],
    });
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: "Tarefas" }));

    // `toBeVisible`, não `toBeInTheDocument`: painel de aba escondido
    // continua no documento, e a versão anterior deste teste passava mesmo
    // com o conteúdo invisível.
    expect(await screen.findByText("Protocolar réplica")).toBeVisible();
    // O filtro por processo é o motivo de a API ter ganhado `processo_numero`:
    // sem ele a tela pediria a lista inteira do grupo.
    expect(mocks.listarTarefas).toHaveBeenCalledWith(
      expect.objectContaining({ processoNumero: NUMERO }),
    );
  });

  it("sem tarefa vinculada, diz isso", async () => {
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: "Tarefas" }));

    expect(await screen.findByText("Nenhuma tarefa vinculada a este processo.")).toBeVisible();
  });

  it("mostra as movimentações coletadas pelo robô", async () => {
    mocks.detalhesProcesso.mockResolvedValue({
      numero_processo: NUMERO,
      processos: [PROCESSO],
      comunicacoes: [
        {
          comunicacao_id: "c1",
          tipo_comunicacao: "Intimação",
          data_disponibilizacao: "2026-08-18",
          nome_orgao: "TJMG",
          texto: "<p>Fica intimada a parte</p>",
        },
      ],
    });
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: "Movimentações" }));

    expect(await screen.findByText("Intimação")).toBeVisible();
    // 🔴 O teor NÃO vem na lista: cinco publicações inteiras empilhadas,
    // cada uma num bloco rolável, tornavam a lista impercorrível.
    expect(screen.queryByText(/Fica intimada a parte/)).not.toBeInTheDocument();
  });

  it("sem movimentação, diz isso em vez de mostrar lista vazia", async () => {
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: "Movimentações" }));

    expect(
      await screen.findByText("Nenhuma movimentação registrada ainda para este processo."),
    ).toBeVisible();
  });
});

const COMUNICACAO = {
  numero_processo: NUMERO,
  comunicacao_id: 4242,
  tipo_comunicacao: "Intimação",
  data_disponibilizacao: "2026-08-18",
  nome_orgao: "TJMG",
  texto: "<p>Fica intimada a parte</p>",
  link: "https://pje.tjmg.jus.br/pje/documento",
};

function comMovimentacao(extra: Record<string, unknown> = {}) {
  mocks.detalhesProcesso.mockResolvedValue({
    numero_processo: NUMERO,
    processos: [PROCESSO],
    comunicacoes: [{ ...COMUNICACAO, ...extra }],
  });
}

/** As três abas.
 *
 * 🔴 A régua aqui é `toBeVisible`, e não `toBeInTheDocument`: os três
 * painéis vão MONTADOS (o de Detalhes é um formulário com estado local que
 * não pode ser descartado), e um painel escondido continua no documento.
 * Os testes que já existiam liam o conteúdo das três abas ao mesmo tempo e
 * teriam passado com as abas completamente quebradas.
 */
describe("as três abas", () => {
  it("abre em Detalhes, com os outros dois painéis escondidos", async () => {
    montar();

    expect(await screen.findByLabelText("Apelido")).toBeVisible();
    expect(painel("Detalhes")).toBeVisible();
    expect(painel("Tarefas")).not.toBeVisible();
    expect(painel("Movimentações")).not.toBeVisible();
  });

  it("trocar de aba escreve na URL -- dá pra mandar o link pra alguém", async () => {
    montar();

    await userEvent.click(await screen.findByRole("tab", { name: "Movimentações" }));

    expect(url()).toContain("aba=movimentacoes");
    expect(painel("Movimentações")).toBeVisible();
    expect(painel("Detalhes")).not.toBeVisible();
  });

  it("a aba da URL é a que abre -- um F5 não devolve pra primeira", async () => {
    montar(`/processos/sg1/${NUMERO}?aba=tarefas`);

    expect(await screen.findByText("Nenhuma tarefa vinculada a este processo.")).toBeVisible();
    expect(painel("Detalhes")).not.toBeVisible();
  });

  it("aba inventada na URL cai na primeira, e não numa tela em branco", async () => {
    montar(`/processos/sg1/${NUMERO}?aba=inventada`);

    expect(await screen.findByLabelText("Apelido")).toBeVisible();
    expect(painel("Detalhes")).toBeVisible();
  });

  it("o que foi digitado sobrevive à ida e volta entre abas", async () => {
    // 🔴 É a razão de os painéis irem montados. Desmontar o de Detalhes ao
    // trocar de aba jogaria fora o rascunho sem aviso nenhum.
    montar();

    const apelido = await screen.findByLabelText("Apelido");
    await userEvent.clear(apelido);
    await userEvent.type(apelido, "Rascunho não salvo");

    await userEvent.click(screen.getByRole("tab", { name: "Movimentações" }));
    await userEvent.click(screen.getByRole("tab", { name: "Detalhes" }));

    expect(await screen.findByLabelText("Apelido")).toHaveValue("Rascunho não salvo");
  });

  it("'Verificado em' fica FORA das abas -- some se ficar dentro de uma", async () => {
    /* Antes morava no cabeçalho do cartão de Movimentações. Dentro da aba,
       só veria quem entrasse nela -- e é justamente o que distingue "o
       processo não teve novidade" de "o robô não conseguiu olhar". */
    montar();

    expect(await screen.findByText(/Verificado em/)).toBeVisible();

    await userEvent.click(screen.getByRole("tab", { name: "Tarefas" }));
    expect(screen.getByText(/Verificado em/)).toBeVisible();
  });
});

describe("o teor da movimentação", () => {
  it("clicar na linha abre o teor e põe a movimentação na URL", async () => {
    comMovimentacao();
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: "Movimentações" }));

    await userEvent.click(await screen.findByRole("button", { name: /Intimação/ }));

    expect(await screen.findByText("Fica intimada a parte")).toBeVisible();
    expect(url()).toContain("comunicacao=4242");
  });

  it("o link da URL abre o teor direto, mesmo sem a aba junto", async () => {
    /* 🔴 Sem forçar a aba, o modal seria filho de um painel com
       `display: none`: existiria no documento e não apareceria na tela. */
    comMovimentacao();
    montar(`/processos/sg1/${NUMERO}?comunicacao=4242`);

    expect(await screen.findByText("Fica intimada a parte")).toBeVisible();
  });

  it("link apontando pra movimentação que não está aqui DIZ isso", async () => {
    comMovimentacao();
    montar(`/processos/sg1/${NUMERO}?comunicacao=9999`);

    expect(
      await screen.findByText("A movimentação deste link não está mais neste processo."),
    ).toBeVisible();
  });

  it("fechar limpa a URL e DEIXA a pessoa na lista de onde ela veio", async () => {
    /* 🔴 Achado em Chrome, não aqui: quem chega por `?comunicacao=` sem
       `?aba=` está na aba de Movimentações porque o parâmetro do teor manda
       nela. Tirar só o parâmetro fazia a tela cair em Detalhes -- fechar um
       teor expulsava a pessoa da lista que ela estava lendo.

       A versão anterior deste teste conferia só a URL, e por isso passava
       com o defeito na tela. */
    comMovimentacao();
    montar(`/processos/sg1/${NUMERO}?comunicacao=4242`);

    await userEvent.click(await screen.findByRole("button", { name: "Fechar" }));

    expect(url()).not.toContain("comunicacao");
    expect(await screen.findByText("Intimação")).toBeVisible();
  });

  it("com envio, oferece o caminho pro e-mail no Histórico", async () => {
    comMovimentacao({ tem_envio: true });
    montar(`/processos/sg1/${NUMERO}?comunicacao=4242`);

    await userEvent.click(await screen.findByRole("button", { name: "Ver o e-mail enviado" }));

    const alvo = JSON.parse((await screen.findByTestId("historico")).textContent ?? "{}");
    expect(alvo.deepLink).toEqual({ processo: NUMERO, comunicacaoId: "4242" });
  });

  it("🔴 SEM envio, o botão não existe -- e a maioria não tem", async () => {
    /* O robô grava o acervo inteiro do processo na primeira checagem e só
       notifica o que está dentro da janela de 30 dias: publicação anterior
       ao cadastro nunca gerou e-mail. Medido em produção, 9 de 73. Oferecer
       sempre levaria a um Histórico sem o registro, que responde "não foi
       possível localizar" -- soa como falha, e não como "nunca existiu". */
    comMovimentacao({ tem_envio: false });
    montar(`/processos/sg1/${NUMERO}?comunicacao=4242`);

    expect(await screen.findByText("Fica intimada a parte")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ver o e-mail enviado" })).not.toBeInTheDocument();
  });

  it("API velha (sem o campo) também não oferece o botão", async () => {
    // Não saber não é motivo pra prometer.
    comMovimentacao();
    montar(`/processos/sg1/${NUMERO}?comunicacao=4242`);

    expect(await screen.findByText("Fica intimada a parte")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Ver o e-mail enviado" })).not.toBeInTheDocument();
  });

  it("o documento no tribunal abre em outra aba, com rel de segurança", async () => {
    comMovimentacao();
    montar(`/processos/sg1/${NUMERO}?comunicacao=4242`);

    const link = await screen.findByRole("link", { name: "Abrir o documento no tribunal" });
    expect(link).toHaveAttribute("href", COMUNICACAO.link);
    // Sem `noopener`, a página aberta ganha `window.opener` e pode navegar
    // esta aqui pra onde quiser.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("as tarefas vinculadas", () => {
  it("clicar numa tarefa abre o modal de edição", async () => {
    // Antes eram texto morto: a lista dizia o que havia pra fazer e não
    // deixava mexer em nada.
    mocks.listarTarefas.mockResolvedValue({
      tarefas: [
        {
          tarefa_id: "t1",
          subgrupo_id: "sg1",
          titulo: "Protocolar réplica",
          data: "2026-09-01",
          coluna_id: "c1",
          prioridade: "Alta",
        },
      ],
    });
    montar();
    await userEvent.click(await screen.findByRole("tab", { name: "Tarefas" }));

    await userEvent.click(await screen.findByRole("button", { name: /Protocolar réplica/ }));

    expect(await screen.findByLabelText(/Descrição da tarefa/)).toHaveValue("Protocolar réplica");
  });
});
