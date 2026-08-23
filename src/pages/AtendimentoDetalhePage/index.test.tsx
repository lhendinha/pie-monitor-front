import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalhesAtendimento: vi.fn(),
  atualizarAtendimento: vi.fn(),
  adicionarRegistro: vi.fn(),
  removerAtendimento: vi.fn(),
  listarClientes: vi.fn(),
  listarMembrosDoGrupo: vi.fn(),
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
  processo_numero: "00002668720218130559",
  registros: [
    { autor_id: "ana@x.com", registrado_em: "2026-08-10T09:00:00+00:00", texto: "Primeiro contato" },
    { autor_id: "joao@x.com", registrado_em: "2026-08-12T14:30:00+00:00", texto: "Cliente retornou" },
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
  mocks.listarMembrosDoGrupo.mockResolvedValue({
    membros: [
      { email: "ana@x.com", apelido: "Ana Paula" },
      { email: "joao@x.com", apelido: "João" },
    ],
  });
  mocks.adicionarRegistro.mockResolvedValue({});
  mocks.atualizarAtendimento.mockResolvedValue({});
  mocks.removerAtendimento.mockResolvedValue({});
});

async function montar() {
  renderComProviders(<AtendimentoDetalhePage />);
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
    // Pra `user` a lista de membros não vem -- o e-mail ainda identifica,
    // e sumir com o autor seria pior.
    mocks.listarMembrosDoGrupo.mockResolvedValue({ membros: [] });
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

describe("status", () => {
  it("escolher outro status salva", async () => {
    await montar();
    await userEvent.click(screen.getByText("Em andamento", { selector: "div" }));
    await userEvent.click(await screen.findByText("Fechado"));

    await waitFor(() =>
      expect(mocks.atualizarAtendimento).toHaveBeenCalledWith("s1", "a1", { status: "Fechado" }),
    );
  });
});

describe("exclusão", () => {
  it("pede confirmação e diz quantos registros somem", async () => {
    await montar();
    await userEvent.click(screen.getByRole("button", { name: "Excluir atendimento" }));

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
    await userEvent.click(screen.getByRole("button", { name: "Excluir atendimento" }));

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
    await userEvent.click(screen.getByRole("button", { name: "Excluir atendimento" }));

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("o seu único registro será removido");
    expect(dialogo).not.toHaveTextContent("1 registro será");
  });

  it("confirmando, exclui e volta pra lista", async () => {
    await montar();
    await userEvent.click(screen.getByRole("button", { name: "Excluir atendimento" }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(mocks.removerAtendimento).toHaveBeenCalledWith("s1", "a1"));
    await waitFor(() => expect(navegou).toHaveBeenCalledWith("/atendimentos"));
  });
});

describe("erro", () => {
  it("link velho pra atendimento excluído explica o que houve", async () => {
    mocks.detalhesAtendimento.mockRejectedValue(new Error("404"));
    renderComProviders(<AtendimentoDetalhePage />);
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
