import { screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalhesAtendimento: vi.fn(),
  atualizarAtendimento: vi.fn(),
  adicionarRegistro: vi.fn(),
  removerAtendimento: vi.fn(),
  listarDocumentos: vi.fn(),
  listarClientes: vi.fn(),
  listarTodosOsMembrosDoGrupo: vi.fn(),
  papelAtende: vi.fn(),
  getApelido: vi.fn(),
  getEmail: vi.fn(),
}));
const navegou = vi.hoisted(() => vi.fn());

vi.mock("../../services", () => mocks);
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navegou,
  useParams: () => ({ subgrupoId: "s1", atendimentoId: "a1" }),
}));

import AtendimentoDetalhePage from "./index";

const ATENDIMENTO = {
  subgrupo_id: "s1",
  atendimento_id: "a1",
  assunto: "Revisão de contrato",
  status: "Em andamento",
  criado_em: "2026-08-10T09:00:00+00:00",
  cliente_ids: ["c1"],
  cliente_nomes: ["Maria Souza"],
  processo_numero: "00002668720218130559",
  /* 🔴 `autor_nome` vem NO registro desde 25/08/2026, resolvido pelo servidor.
     Antes a linha do tempo traduzia e-mail em apelido com o catálogo inteiro
     de pessoas do grupo -- e aquela consulta só rodava pra `manager` pra
     cima, então quem é `user` via e-mail cru. */
  registros: [
    { autor_id: "ana@x.com", autor_nome: "Ana Paula",
      registrado_em: "2026-08-10T09:00:00+00:00", texto: "Primeiro contato" },
    { autor_id: "joao@x.com", autor_nome: "João",
      registrado_em: "2026-08-12T14:30:00+00:00", texto: "Cliente retornou" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.papelAtende.mockReturnValue(true);
  mocks.getApelido.mockReturnValue("Ana");
  mocks.getEmail.mockReturnValue("ana@x.com");
  mocks.detalhesAtendimento.mockResolvedValue(ATENDIMENTO);
  mocks.listarClientes.mockResolvedValue({
    clientes: [{ cliente_id: "c1", nome: "Maria Souza", grupo_id: "g1" }],
  });
  mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({
    membros: [
      { email: "ana@x.com", apelido: "Ana Paula" },
      { email: "joao@x.com", apelido: "João" },
    ],
  });
  mocks.adicionarRegistro.mockResolvedValue({});
  mocks.atualizarAtendimento.mockResolvedValue({});
  mocks.removerAtendimento.mockResolvedValue({});
  mocks.listarDocumentos.mockResolvedValue({
    documentos: [
      { subgrupo_id: "s1", documento_id: "d1", grupo_id: "g1", tipo: "arquivo",
        titulo: "Procuração", tamanho_bytes: 2048, criado_em: "2026-08-20T10:00:00+00:00" },
    ],
    total: 1,
    total_paginas: 1,
  });
});

/** 🔴 Dentro de um `MemoryRouter`, e não solto.
 *
 * A tela passou a ter abas, e a aba vive na URL (`?aba=`) como nas duas
 * telas de detalhe irmãs. `useSearchParams` exige um roteador em volta --
 * sem ele o componente estoura antes de renderizar qualquer coisa.
 *
 * O mock de `react-router-dom` abaixo continua trocando só `useNavigate` e
 * `useParams`: `useSearchParams` fica o REAL, porque é justamente a leitura
 * da URL que os testes de aba precisam exercitar. */
function envolver(ui: React.ReactElement, rota = "/atendimentos/s1/a1") {
  return <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>;
}

async function montar(rota?: string) {
  renderComProviders(envolver(<AtendimentoDetalhePage />, rota));
  return await screen.findByRole("heading", { name: "Revisão de contrato" });
}

describe("cabeçalho", () => {
  it("mostra status, cliente por NOME e o processo mascarado", async () => {
    await montar();
    /* Duas vezes de propósito: a etiqueta (o estado atual, que se lê de
     * relance) e o seletor (por onde se muda). A etiqueta é o `<span>`. */
    expect(screen.getByText("Em andamento", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    expect(screen.getByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
  });
});

describe("linha do tempo", () => {
  it("mostra os registros na ordem de escrita", async () => {
    await montar();
    const textos = screen.getAllByText(/Primeiro contato|Cliente retornou/);
    expect(textos.map((t) => t.textContent)).toEqual(["Primeiro contato", "Cliente retornou"]);
  });

  it("mostra o APELIDO de quem escreveu, não o e-mail", async () => {
    await montar();
    expect(screen.getByText("Ana Paula")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.queryByText("joao@x.com")).not.toBeInTheDocument();
  });

  it("cai no e-mail quando o apelido não existe", async () => {
    /* `autor_nome` ausente: quem nunca definiu apelido, ou autor de outro
       grupo (o servidor resolve dentro do grupo de quem lê). O e-mail ainda
       identifica, e sumir com o autor seria pior. */
    mocks.detalhesAtendimento.mockResolvedValue({
      ...ATENDIMENTO,
      registros: [{ autor_id: "ana@x.com", autor_nome: null,
                    registrado_em: "2026-08-10T09:00:00+00:00", texto: "Primeiro contato" }],
    });
    await montar();
    expect(await screen.findByText("ana@x.com")).toBeInTheDocument();
  });

  it("não oferece editar nem excluir registro -- é append-only", async () => {
    await montar();
    expect(screen.queryByRole("button", { name: /Editar registro/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir registro/i })).not.toBeInTheDocument();
  });
});

describe("novo registro", () => {
  it("envia o texto e limpa o campo", async () => {
    await montar();
    const campo = screen.getByLabelText("Novo registro do atendimento");
    await userEvent.type(campo, "Enviei a minuta");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar registro" }));

    await waitFor(() =>
      expect(mocks.adicionarRegistro).toHaveBeenCalledWith("s1", "a1", "Enviei a minuta"),
    );
    await waitFor(() => expect(campo).toHaveValue(""));
  });

  it("🔴 NÃO limpa o campo quando o envio falha", async () => {
    /* Quem escreveu três parágrafos e viu a rede cair não pode perdê-los. */
    mocks.adicionarRegistro.mockRejectedValue(new Error("caiu"));
    await montar();

    const campo = screen.getByLabelText("Novo registro do atendimento");
    await userEvent.type(campo, "Texto que não pode sumir");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar registro" }));

    await waitFor(() => expect(mocks.adicionarRegistro).toHaveBeenCalled());
    expect(campo).toHaveValue("Texto que não pode sumir");
  });

  it("o botão é SÓ ícone, e por isso precisa de nome acessível", async () => {
    /* É o único nome que ele tem -- sem o `aria-label`, leitor de tela lê
     * um botão vazio e o teste aqui seria a única forma de perceber. */
    await montar();
    const botao = screen.getByRole("button", { name: "Adicionar registro" });
    expect(botao.textContent).toBe("");
    expect(botao.querySelector("svg")).toBeTruthy();
  });

  it("botão travado com o campo vazio", async () => {
    await montar();
    expect(screen.getByRole("button", { name: "Adicionar registro" })).toBeDisabled();
  });

  it("só espaço em branco não conta como texto", async () => {
    await montar();
    await userEvent.type(screen.getByLabelText("Novo registro do atendimento"), "   ");
    expect(screen.getByRole("button", { name: "Adicionar registro" })).toBeDisabled();
  });
});

describe("aba Detalhes", () => {
  /** 🔴 **Este bloco MUDOU em 26/08/2026, e a mudança é a feature.**
   *
   * O status era um `Select` solto no cabeçalho que salvava SOZINHO ao
   * escolher -- um controle sem "Salvar", ao lado do botão de excluir,
   * enquanto o assunto não tinha onde ser editado.
   *
   * Virou campo da aba Detalhes: status é campo, e campo se edita em
   * formulário.
   */
  async function abrirDetalhes() {
    await montar();
    await userEvent.click(screen.getByRole("tab", { name: "Detalhes" }));
  }

  it("salva assunto, status e responsáveis num PATCH só", async () => {
    /* Um PATCH por campo faria o servidor comparar e notificar três vezes o
       que é uma edição só. */
    await abrirDetalhes();

    await userEvent.click(screen.getByLabelText("Status"));
    await userEvent.click(await screen.findByRole("option", { name: "Fechado" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarAtendimento).toHaveBeenCalledWith("s1", "a1", {
        assunto: "Revisão de contrato",
        status: "Fechado",
        responsaveis: [],
      }),
    );
  });

  it("🔴 'Salvar' fica DESABILITADO enquanto nada mudou", async () => {
    /* Sem isto, salvar um formulário intocado manda um PATCH que reenvia a
       mesma lista de responsáveis. O servidor compara antes de notificar, mas
       a requisição à toa continua sendo à toa. */
    await abrirDetalhes();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("o campo de status NÃO aparece com a aba Registros aberta", async () => {
    /* O par negativo: sem ele, deixar o `Select` antigo no cabeçalho por
       engano passaria -- e a tela teria dois jeitos de mudar a mesma coisa,
       um deles salvando sozinho.

       ⚠️ **`toBeVisible`, não `toBeInTheDocument`.** Os painéis vão MONTADOS
       de propósito (o rascunho de `NovoRegistro` não pode ser descartado ao
       trocar de aba), então o campo EXISTE no DOM mesmo escondido. A pergunta
       certa é o que a pessoa vê. */
    await montar();
    expect(screen.getByLabelText("Status")).not.toBeVisible();
  });

  it("a ETIQUETA de status continua no cabeçalho", async () => {
    /* Ela informa, e é o que se quer ver de relance ao abrir -- só o
       CONTROLE mudou de lugar. */
    await montar();
    expect(screen.getByText("Em andamento", { selector: "span" })).toBeVisible();
  });
});

describe("exclusão", () => {

  it("pede confirmação e diz quantos registros somem", async () => {
    await montar();
    /* ⚠️ Por /Excluir/, e não pelo `aria-label` "Excluir atendimento": o
       botão passou a ter TEXTO em 26/08/2026, no visual de
       `FormularioProcesso` -- só o ícone obrigava a passar o mouse pra
       descobrir o que ele faz. */
    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent(
      "O atendimento Revisão de contrato e todos os seus 2 registros serão removidos.",
    );
    expect(mocks.removerAtendimento).not.toHaveBeenCalled();
  });

  it("o nome do atendimento vem em NEGRITO", async () => {
    /* É o nome que a pessoa confere antes de apagar -- tem que saltar da
     * frase. Todas as outras confirmações do sistema fazem assim. */
    await montar();
    /* ⚠️ Por /Excluir/, e não pelo `aria-label` "Excluir atendimento": o
       botão passou a ter TEXTO em 26/08/2026, no visual de
       `FormularioProcesso` -- só o ícone obrigava a passar o mouse pra
       descobrir o que ele faz. */
    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));

    const dialogo = await screen.findByRole("dialog");
    const negrito = dialogo.querySelector("strong");
    expect(negrito?.textContent).toBe("Revisão de contrato");
  });

  it("com UM registro, a frase vai no singular por extenso", async () => {
    // "1 registro" soa a formulário; o artifact escreve "o seu único".
    mocks.detalhesAtendimento.mockResolvedValue({
      ...ATENDIMENTO,
      registros: [ATENDIMENTO.registros[0]],
    });
    await montar();
    /* ⚠️ Por /Excluir/, e não pelo `aria-label` "Excluir atendimento": o
       botão passou a ter TEXTO em 26/08/2026, no visual de
       `FormularioProcesso` -- só o ícone obrigava a passar o mouse pra
       descobrir o que ele faz. */
    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("o seu único registro será removido");
    expect(dialogo).not.toHaveTextContent("1 registro será");
  });

  it("confirmando, exclui e volta pra lista", async () => {
    await montar();
    /* ⚠️ Por /Excluir/, e não pelo `aria-label` "Excluir atendimento": o
       botão passou a ter TEXTO em 26/08/2026, no visual de
       `FormularioProcesso` -- só o ícone obrigava a passar o mouse pra
       descobrir o que ele faz. */
    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerAtendimento).toHaveBeenCalledWith("s1", "a1"));
    await waitFor(() => expect(navegou).toHaveBeenCalledWith("/atendimentos"));
  });
});

describe("erro", () => {
  it("link velho pra atendimento excluído explica o que houve", async () => {
    mocks.detalhesAtendimento.mockRejectedValue(new Error("404"));
    renderComProviders(envolver(<AtendimentoDetalhePage />));
    expect(await screen.findByText(/pode ter sido excluído/)).toBeInTheDocument();
  });
});

describe("fidelidade ao artifact", () => {
  /* Os chips daqui levam ÍCONE, ao contrário dos do detalhe do processo
   * (que no artifact são só texto): aqui eles dizem coisas de naturezas
   * diferentes -- quem é o cliente e a que processo isto se liga --, e sem
   * o ícone as duas pílulas ficam indistinguíveis à primeira vista.
   *
   * As MEDIDAS ficam na verificação em Chrome; aqui trava-se a estrutura. */

  it("o chip do cliente tem ícone", async () => {
    await montar();
    const chip = (await screen.findByText("Maria Souza")).closest("div");
    expect(chip?.querySelector("svg")).toBeTruthy();
  });

  it("o chip do processo tem ícone", async () => {
    await montar();
    const chip = screen.getByText("0000266-87.2021.8.13.0559").closest("div");
    expect(chip?.querySelector("svg")).toBeTruthy();
  });
});

describe("abas", () => {
  /* 🔴 Esta tela NÃO tinha abas -- era a linha do tempo direto, enquanto
   * processo e cliente já se dividiam assim. Documentos entrou como aba nas
   * três, e uma tela sem abas ao lado de duas com abas faria o mesmo
   * conteúdo ser procurado em dois lugares diferentes. */

  /** O painel que a aba comanda. Painel escondido tem nome acessível vazio,
   * então `getByRole("tabpanel", { name })` não acha os inativos -- mesmo
   * gêmeo de `ProcessoDetalhePage` e `ClienteDetalhePage`. */
  function painel(nome: string) {
    const aba = screen.getByRole("tab", { name: nome });
    const alvo = document.getElementById(aba.getAttribute("aria-controls") ?? "");
    if (!alvo) throw new Error(`A aba "${nome}" aponta pra um painel que não existe.`);
    return alvo;
  }

  it("abre em Registros -- é o que a tela sempre foi", async () => {
    await montar();
    expect(screen.getByRole("tab", { name: "Registros" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("a aba vem da URL, pra a tela sobreviver a um F5", async () => {
    await montar("/atendimentos/s1/a1?aba=documentos");
    expect(screen.getByRole("tab", { name: "Documentos" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("aba desconhecida na URL cai na primeira, não em tela branca", async () => {
    await montar("/atendimentos/s1/a1?aba=inventada");
    expect(screen.getByRole("tab", { name: "Registros" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("🔴 o que foi digitado em 'Novo registro' SOBREVIVE à troca de aba", async () => {
    /* É o que obriga os painéis a ficarem MONTADOS. `NovoRegistro` tem
     * estado local; desmontá-lo ao trocar de aba jogaria fora a anotação que
     * a pessoa acabou de escrever -- num campo cujo conteúdo, depois de
     * salvo, não se edita nem se apaga.
     *
     * Sem isso o defeito seria invisível em revisão: a aba volta, o campo
     * está vazio, e parece que a pessoa não digitou. */
    await montar();

    const campo = screen.getByLabelText("Novo registro do atendimento");
    await userEvent.type(campo, "Cliente ligou às 15h pedindo cópia");

    await userEvent.click(screen.getByRole("tab", { name: "Documentos" }));
    await userEvent.click(screen.getByRole("tab", { name: "Registros" }));

    expect(
      screen.getByLabelText<HTMLTextAreaElement>("Novo registro do atendimento").value,
    ).toBe("Cliente ligou às 15h pedindo cópia");
  });

  it("a aba de documentos filtra POR ESTE atendimento", async () => {
    /* Sem o filtro ela mostraria os documentos do escritório inteiro dentro
     * de um atendimento -- e a aba passaria a mentir sobre o que reúne. */
    await montar("/atendimentos/s1/a1?aba=documentos");
    await waitFor(() =>
      expect(mocks.listarDocumentos).toHaveBeenCalledWith(
        expect.objectContaining({ atendimentoId: "a1" }),
      ),
    );
    expect(within(painel("Documentos")).getByText("Procuração")).toBeInTheDocument();
  });
});
