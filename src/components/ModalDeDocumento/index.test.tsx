import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import { DOCUMENTO_ARQUIVO, DOCUMENTO_LINK } from "../../constants/documento";

const mocks = vi.hoisted(() => ({
  criarDocumento: vi.fn(),
  prepararEnvio: vi.fn(),
  enviarArquivo: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarClientes: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ModalDeDocumento from "./index";

const ENVIO = {
  chave: "g1/abc123",
  url: "https://argos-monitor-documentos-prod.s3.sa-east-1.amazonaws.com/",
  campos: { key: "g1/abc123", policy: "...", "x-amz-signature": "..." },
};

function arquivoDe(nome: string, bytes = 1024): File {
  const arquivo = new File(["x"], nome, { type: "application/pdf" });
  Object.defineProperty(arquivo, "size", { value: bytes });
  return arquivo;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
  });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.prepararEnvio.mockResolvedValue(ENVIO);
  mocks.enviarArquivo.mockResolvedValue(undefined);
  mocks.criarDocumento.mockResolvedValue({ mensagem: "cadastrado" });
});

function montar(props: Partial<Parameters<typeof ModalDeDocumento>[0]> = {}) {
  const onSalvo = vi.fn();
  const onFechar = vi.fn();
  renderComProviders(
    <MemoryRouter>
      <ModalDeDocumento onSalvo={onSalvo} onFechar={onFechar} {...props} />
    </MemoryRouter>,
  );
  return { onSalvo, onFechar };
}

const salvar = () => screen.getByRole("button", { name: /^Salvar$/ });

/** Troca o tipo do documento.
 *
 * ⚠️ Duas armadilhas, as duas já pisadas aqui:
 *
 * 1. **Não é `<select>` nativo** -- é `react-select`, então `selectOptions`
 *    erra com "Value not found in options", que soa como opção faltando e é
 *    só o elemento errado.
 * 2. **Não dá pra abrir clicando no texto "Arquivo"**: ele aparece DUAS
 *    vezes na tela -- como valor deste seletor e como rótulo do campo de
 *    arquivo logo abaixo. Por isso o controle é alcançado pelo papel e pelo
 *    nome acessível, que são únicos.
 */
async function escolherTipo(rotuloNovo: string) {
  await userEvent.click(screen.getByRole("combobox", { name: /Tipo/ }));
  await userEvent.click(await screen.findByText(rotuloNovo));
}

/** Espera o seletor de subgrupo ter opção -- sem subgrupo o "Salvar" fica
 * travado, e um clique nele não diria nada. */
async function comSubgrupoCarregado() {
  await waitFor(() => expect(mocks.listarSubgrupos).toHaveBeenCalled());
}

describe("ramo do arquivo", () => {
  it("🔴 envia ANTES de criar o registro, e nessa ordem", async () => {
    /* A ordem é a decisão inteira do desenho: nada é gravado até o arquivo
       estar no armazenamento. Invertida, ela traria de volta o estado
       "envio incompleto" -- com linha na lista, botão de reenviar e rota de
       confirmar -- pra cobrir uma janela que só existe porque o registro
       nasceu cedo demais. */
    const chamadas: string[] = [];
    mocks.prepararEnvio.mockImplementation(async () => {
      chamadas.push("preparar");
      return ENVIO;
    });
    mocks.enviarArquivo.mockImplementation(async () => void chamadas.push("enviar"));
    mocks.criarDocumento.mockImplementation(async () => {
      chamadas.push("criar");
      return {};
    });

    const { onSalvo } = montar();
    await comSubgrupoCarregado();

    await userEvent.upload(
      screen.getByLabelText(/escolher ou arraste/i),
      arquivoDe("peticao-inicial.pdf"),
    );
    await userEvent.click(salvar());

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(chamadas).toEqual(["preparar", "enviar", "criar"]);
  });

  it("manda a CHAVE que o servidor assinou, e o nome original do arquivo", async () => {
    const { onSalvo } = montar();
    await comSubgrupoCarregado();

    await userEvent.upload(
      screen.getByLabelText(/escolher ou arraste/i),
      arquivoDe("procuracao.pdf"),
    );
    await userEvent.click(salvar());
    await waitFor(() => expect(onSalvo).toHaveBeenCalled());

    expect(mocks.criarDocumento).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({
        tipo: DOCUMENTO_ARQUIVO,
        chave: ENVIO.chave,
        nome_arquivo: "procuracao.pdf",
      }),
    );
  });

  it("o nome do arquivo vira o título, e continua editável", async () => {
    montar();
    await comSubgrupoCarregado();

    await userEvent.upload(
      screen.getByLabelText(/escolher ou arraste/i),
      arquivoDe("contrato-assinado.pdf"),
    );

    const titulo = screen.getByLabelText<HTMLInputElement>(/^Título/);
    expect(titulo.value).toBe("contrato-assinado.pdf");

    await userEvent.clear(titulo);
    await userEvent.type(titulo, "Contrato de honorários");
    expect(titulo.value).toBe("Contrato de honorários");
  });
});

describe("ramo do link", () => {
  it("cria SEM tocar no armazenamento -- é a mesma rota, sem chave", async () => {
    const { onSalvo } = montar();
    await comSubgrupoCarregado();

    await escolherTipo("Link");
    await userEvent.type(
      screen.getByLabelText(/^Endereço/),
      "https://exemplo.invalido/certidao",
    );
    await userEvent.type(screen.getByLabelText(/^Título/), "Certidão negativa");
    await userEvent.click(salvar());

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(mocks.prepararEnvio).not.toHaveBeenCalled();
    expect(mocks.enviarArquivo).not.toHaveBeenCalled();
    expect(mocks.criarDocumento).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ tipo: DOCUMENTO_LINK, url: "https://exemplo.invalido/certidao" }),
    );
  });

  it("não oferece área de arquivo -- link não tem o que enviar", async () => {
    montar();
    await comSubgrupoCarregado();

    await escolherTipo("Link");

    expect(screen.queryByLabelText(/escolher ou arraste/i)).not.toBeInTheDocument();
  });
});

describe("quando o envio falha", () => {
  it("🔴 o modal FICA ABERTO com o que já foi digitado", async () => {
    /* Um arquivo de 20 MB que falha no fim custaria tudo de novo -- inclusive
       a descrição digitada. É por isso que o envio acontece com o modal
       aberto: a pessoa está ali, e tentar de novo é um clique. */
    mocks.enviarArquivo.mockRejectedValue(new Error("O envio expirou."));

    const { onSalvo, onFechar } = montar();
    await comSubgrupoCarregado();

    await userEvent.upload(
      screen.getByLabelText(/escolher ou arraste/i),
      arquivoDe("peticao.pdf"),
    );
    const descricao = screen.getByLabelText(/^Descrição/);
    await userEvent.type(descricao, "Protocolada em 20/08");
    await userEvent.click(salvar());

    await waitFor(() => expect(mocks.enviarArquivo).toHaveBeenCalled());

    expect(onSalvo).not.toHaveBeenCalled();
    expect(onFechar).not.toHaveBeenCalled();
    // 🔴 E NADA foi gravado: o registro só nasce depois do arquivo.
    expect(mocks.criarDocumento).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLTextAreaElement>(/^Descrição/).value).toBe(
      "Protocolada em 20/08",
    );
    expect(screen.getByText("peticao.pdf")).toBeInTheDocument();
  });
});

describe("vínculo já preenchido", () => {
  it("nasce com o processo de onde o modal foi aberto", async () => {
    montar({
      subgrupoInicial: "s1",
      vinculosIniciais: {
        processo: { tipo: "processo", id: "00002668720218130559", rotulo: "0000266-87.2021.8.13.0559" },
      },
    });
    await comSubgrupoCarregado();

    /* Pelo RÓTULO mascarado, não pelo id: a etiqueta é onde a pessoa confere
       que vinculou ao processo certo, e vinte dígitos colados não se
       conferem. */
    expect(screen.getByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
  });
});

describe("o que o modal NÃO faz", () => {
  it("🔴 só CRIA -- não tem Excluir", () => {
    /* Editar e excluir vivem na tela do documento, como em Processos e
       Clientes. Um modal que também edita traria duas telas pra mesma
       coisa. */
    montar();
    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
    expect(screen.getByText("Adicionar documento")).toBeInTheDocument();
  });
});
