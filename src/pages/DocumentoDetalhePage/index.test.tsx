import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalhesDocumento: vi.fn(),
  atualizarDocumento: vi.fn(),
  removerDocumento: vi.fn(),
  substituirArquivo: vi.fn(),
  linkDeDownload: vi.fn(),
  prepararEnvio: vi.fn(),
  enviarArquivo: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarClientes: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
  /* A régua de quem pode DESTRUIR lê a sessão. Sem estes dois no mock, o
     `vi.mock` do módulo inteiro faz a importação explodir. */
  papelAtende: vi.fn(),
  getEmail: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import DocumentoDetalhePage from "./index";

const DOCUMENTO = {
  subgrupo_id: "s1",
  documento_id: "d1",
  grupo_id: "g1",
  tipo: "arquivo",
  titulo: "peticao-inicial-assinada.pdf",
  descricao: "Protocolada em 20/08",
  nome_arquivo: "peticao-inicial-assinada.pdf",
  chave_s3: "g1/abc",
  tamanho_bytes: 1536,
  content_type: "application/pdf",
  processo_numero: "00002668720218130559",
  cliente_ids: ["c1"],
  cliente_nomes: ["Construtora Alfa"],
  responsavel_id: "ana@x.com",
  responsavel_nome: "Ana Paula",
  criado_em: "2026-08-20T10:00:00+00:00",
};

const LINK = {
  ...DOCUMENTO,
  documento_id: "d2",
  tipo: "link",
  titulo: "Certidão negativa",
  nome_arquivo: null,
  chave_s3: null,
  tamanho_bytes: null,
  url: "https://exemplo.invalido/certidao",
};

function Espiao() {
  const { pathname } = useLocation();
  return <div data-testid="url">{pathname}</div>;
}

function montar(rota = "/documentos/s1/d1") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/documentos" element={<div>lista de documentos</div>} />
        <Route
          path="/documentos/:subgrupoId/:documentoId"
          element={<DocumentoDetalhePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

async function carregada() {
  return await screen.findByRole("heading", { name: DOCUMENTO.titulo });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalhesDocumento.mockResolvedValue(DOCUMENTO);
  mocks.atualizarDocumento.mockResolvedValue({});
  mocks.removerDocumento.mockResolvedValue({});
  mocks.substituirArquivo.mockResolvedValue({});
  mocks.linkDeDownload.mockResolvedValue({ url: "https://assinada.invalido/x" });
  mocks.prepararEnvio.mockResolvedValue({ chave: "g1/novo", url: "https://s3", campos: {} });
  mocks.enviarArquivo.mockResolvedValue(undefined);
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana Paula" }],
  });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  /* O padrão dos testes é `manager`: eles exercitam o comportamento da tela,
     não a permissão. Quem testa a permissão a declara explicitamente. */
  mocks.papelAtende.mockReturnValue(true);
  mocks.getEmail.mockReturnValue("ana@x.com");
});

/** A sessão de um `user` -- que é onde a régua de destruir morde. */
function comoUser(email: string) {
  mocks.papelAtende.mockReturnValue(false);
  mocks.getEmail.mockReturnValue(email);
}

describe("hidratação", () => {
  it("🔴 se carrega SOZINHA pelo par (subgrupo, id) da URL", async () => {
    /* É o que separa esta tela de um modal: ela é rota, então precisa
       sobreviver a um F5 e a um link colado. Pela listagem não daria -- ela
       não filtra por id, seria paginar tudo até achar. */
    montar();
    await carregada();
    expect(mocks.detalhesDocumento).toHaveBeenCalledWith("s1", "d1");
  });

  it("🔴 os campos nascem PREENCHIDOS com o que veio", async () => {
    /* O formulário só monta depois da resposta -- ver `FormularioDocumento`.
       Montado antes, o estado nasceria vazio, nada o preencheria depois, e
       salvar apagaria o documento inteiro em silêncio. */
    montar();
    await carregada();

    expect(screen.getByLabelText<HTMLInputElement>(/^Título/).value).toBe(DOCUMENTO.titulo);
    expect(screen.getByLabelText<HTMLTextAreaElement>(/^Descrição/).value).toBe(
      "Protocolada em 20/08",
    );
    // O vínculo, pelo número MASCARADO -- não pelos vinte dígitos colados.
    expect(screen.getByText("0000266-87.2021.8.13.0559")).toBeInTheDocument();
    // E o cliente pelo NOME que o servidor resolveu, não pelo id.
    expect(screen.getByText("Construtora Alfa")).toBeInTheDocument();
  });

  it("link velho aponta pra documento excluído -- diz isso, e não fica tentando", async () => {
    mocks.detalhesDocumento.mockRejectedValue(new Error("não encontrado"));
    montar();
    expect(await screen.findByText(/pode ter sido excluído/)).toBeInTheDocument();
    expect(mocks.detalhesDocumento).toHaveBeenCalledTimes(1);
  });
});

describe("editar", () => {
  it("🔴 mudar o TÍTULO não manda `nome_arquivo`", async () => {
    /* São campos diferentes de propósito: o título é como o documento
       aparece na lista, `nome_arquivo` é com que nome ele BAIXA. Se o PATCH
       levasse os dois juntos, renomear o título mudaria o nome do arquivo
       baixado meses depois -- e ninguém ligaria uma coisa à outra. */
    montar();
    await carregada();

    const titulo = screen.getByLabelText(/^Título/);
    await userEvent.clear(titulo);
    await userEvent.type(titulo, "Petição inicial");
    await userEvent.click(screen.getByRole("button", { name: /^Salvar$/ }));

    await waitFor(() => expect(mocks.atualizarDocumento).toHaveBeenCalled());
    const [, , campos] = mocks.atualizarDocumento.mock.calls[0];
    expect(campos.titulo).toBe("Petição inicial");
    expect(campos).not.toHaveProperty("nome_arquivo");
  });

  it("🔴 não manda `url` num ARQUIVO", async () => {
    /* `url` é campo do tipo `link`. Mandá-la vazia num arquivo seria gravar
       um campo que não é dele -- e o servidor a aceitaria. */
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: /^Salvar$/ }));

    await waitFor(() => expect(mocks.atualizarDocumento).toHaveBeenCalled());
    expect(mocks.atualizarDocumento.mock.calls[0][2]).not.toHaveProperty("url");
  });

  it("desfazer o vínculo manda `null` EXPLÍCITO, não omissão", async () => {
    /* Num PATCH parcial, omitir significa "não mexa". `null` é o que
       DESFAZ -- sem isso, remover a etiqueta na tela não removeria o vínculo
       no banco, e a pessoa veria o processo de volta no próximo F5. */
    montar();
    await carregada();

    await userEvent.click(
      screen.getByRole("button", { name: /Remover Processo 0000266-87/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: /^Salvar$/ }));

    await waitFor(() => expect(mocks.atualizarDocumento).toHaveBeenCalled());
    expect(mocks.atualizarDocumento.mock.calls[0][2].processo_numero).toBeNull();
  });
});

describe("excluir", () => {
  it("🔴 avisa que o ARQUIVO some, e que não dá pra recuperar", async () => {
    /* É o que separa esta exclusão das outras do sistema: apagar uma tarefa
       apaga uma linha; apagar um documento destrói o arquivo, e o bucket não
       tem versionamento. */
    montar();
    await carregada();

    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    expect(await screen.findByText(/não pode ser recuperado/)).toBeInTheDocument();
  });

  it("confirmado, apaga e volta pra listagem", async () => {
    montar();
    await carregada();

    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(
      screen.getAllByRole("button", { name: /Excluir/ }).find((b) => dialogo.contains(b))!,
    );

    await waitFor(() => expect(mocks.removerDocumento).toHaveBeenCalledWith("s1", "d1"));
    await waitFor(() => expect(url()).toBe("/documentos"));
  });

  it("🔴 NÃO rebusca o documento que acabou de apagar", async () => {
    /* Achado em Chrome, não aqui: `qk.documento` começa com
       `["documentos"]`, então invalidar o prefixo derrubava a consulta desta
       tela -- ainda montada -- e ela rebuscava o documento apagado, tomando
       404. `removeQueries` tira a entrada do cache: não há o que rebuscar.

       O teste conta CHAMADAS porque é isso que o 404 era. */
    montar();
    await carregada();
    expect(mocks.detalhesDocumento).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    const dialogo = await screen.findByRole("dialog");
    await userEvent.click(
      screen.getAllByRole("button", { name: /Excluir/ }).find((b) => dialogo.contains(b))!,
    );

    await waitFor(() => expect(url()).toBe("/documentos"));
    expect(mocks.detalhesDocumento).toHaveBeenCalledTimes(1);
  });

  it("num LINK não promete apagar arquivo nenhum -- não existe arquivo", async () => {
    mocks.detalhesDocumento.mockResolvedValue(LINK);
    montar("/documentos/s1/d2");
    await screen.findByRole("heading", { name: "Certidão negativa" });

    await userEvent.click(screen.getByRole("button", { name: /Excluir/ }));
    await screen.findByRole("dialog");
    expect(screen.queryByText(/não pode ser recuperado/)).not.toBeInTheDocument();
  });
});

describe("o arquivo", () => {
  it("mostra o NOME DE DOWNLOAD e o tamanho medido", async () => {
    /* O nome com que ele baixa aparece aqui de propósito: é o que impede a
       surpresa de renomear o título e receber outro nome no download. */
    montar();
    await carregada();

    // Duas vezes na tela (título e nome do arquivo), então basta existir.
    expect(screen.getAllByText("peticao-inicial-assinada.pdf").length).toBeGreaterThan(0);
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("baixar pede a URL assinada -- a API não devolve o arquivo", async () => {
    /* Devolver o conteúdo pela API esbarraria no teto de 6 MB do Lambda, o
       mesmo motivo de o envio não passar por lá. */
    montar();
    await carregada();

    await userEvent.click(screen.getByRole("button", { name: /^Baixar$/ }));
    await waitFor(() => expect(mocks.linkDeDownload).toHaveBeenCalledWith("s1", "d1"));
  });

  it("um LINK não oferece baixar nem substituir", async () => {
    mocks.detalhesDocumento.mockResolvedValue(LINK);
    montar("/documentos/s1/d2");
    await screen.findByRole("heading", { name: "Certidão negativa" });

    expect(screen.queryByRole("button", { name: /^Baixar$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Substituir/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /exemplo.invalido/ })).toBeInTheDocument();
  });

  it("substituir manda a chave NOVA, depois de enviar", async () => {
    montar();
    await carregada();

    await userEvent.click(screen.getByRole("button", { name: /Substituir/ }));
    const arquivo = new File(["x"], "peticao-v2.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText(/escolher ou arraste/i), arquivo);

    await waitFor(() =>
      expect(mocks.substituirArquivo).toHaveBeenCalledWith("s1", "d1", "g1/novo", "peticao-v2.pdf"),
    );
    // A ordem importa: o objeto antigo só é apagado depois que o registro
    // aponta pro novo, e quem faz isso é o servidor -- mas o envio vem antes.
    expect(mocks.enviarArquivo).toHaveBeenCalled();
  });
});

describe("tipo desconhecido", () => {
  it("🔴 mostra o rótulo CRU em vez de sumir com o documento", async () => {
    /* `tipo` é string aberta no backend, pra o "documento padrão" entrar
       depois sem migração. Uma tela que filtra o que não conhece esconderia
       documento que existe -- e esconder é pior que rotular feio. */
    mocks.detalhesDocumento.mockResolvedValue({
      ...DOCUMENTO,
      tipo: "modelo",
      titulo: "Contrato padrão",
    });
    montar();

    expect(await screen.findByRole("heading", { name: "Contrato padrão" })).toBeInTheDocument();
    expect(screen.getByText("modelo")).toBeInTheDocument();
  });
});

describe("quem pode destruir", () => {
  /* 🔴 Mais apertado que tarefa e atendimento de propósito: lá some uma
   * linha, aqui some o ARQUIVO -- e o bucket não tem versionamento.
   *
   * Espelha `documentos_service._garantir_pode_destruir`. Esconder o botão
   * não é a proteção (quem manda é a rota); é pra não oferecer o que a API
   * vai negar -- botão que existe e falha em 403 parece defeito. */

  it("🔴 `user` NÃO vê Excluir nem Substituir num documento de outra pessoa", async () => {
    comoUser("outro@x.com");
    mocks.detalhesDocumento.mockResolvedValue({ ...DOCUMENTO, criado_por: "ana@x.com" });
    montar();
    await carregada();

    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Substituir/ })).not.toBeInTheDocument();
  });

  it("mas CONTINUA vendo Baixar e Salvar", async () => {
    /* A trava é sobre DESTRUIR, não sobre usar nem sobre mexer. Baixar é
       leitura -- o documento está ali pra ser lido. Corrigir um título é
       reversível. Estender a trava a esses dois seria burocracia sem nada
       protegido em troca. */
    comoUser("outro@x.com");
    mocks.detalhesDocumento.mockResolvedValue({ ...DOCUMENTO, criado_por: "ana@x.com" });
    montar();
    await carregada();

    expect(screen.getByRole("button", { name: /^Baixar$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Salvar$/ })).toBeInTheDocument();
  });

  it("o par: `user` VÊ os dois no documento que ele mesmo adicionou", async () => {
    /* Sem este par, uma régua que escondesse o botão de todo mundo passaria
       igual. E é ele que garante o desfazer do próprio engano de dez
       segundos sem depender de terceiro. */
    comoUser("ana@x.com");
    mocks.detalhesDocumento.mockResolvedValue({ ...DOCUMENTO, criado_por: "ana@x.com" });
    montar();
    await carregada();

    expect(screen.getByRole("button", { name: /Excluir/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Substituir/ })).toBeInTheDocument();
  });

  it("`manager`+ vê os dois em documento de qualquer um", async () => {
    mocks.papelAtende.mockReturnValue(true);
    mocks.getEmail.mockReturnValue("chefe@x.com");
    mocks.detalhesDocumento.mockResolvedValue({ ...DOCUMENTO, criado_por: "ana@x.com" });
    montar();
    await carregada();

    expect(screen.getByRole("button", { name: /Excluir/ })).toBeInTheDocument();
  });

  it("🔴 documento SEM dono conhecido cai pro lado restritivo", async () => {
    /* `criado_por` vazio (documento antigo, ou semeado direto no banco) não
       pode casar com ninguém. Sem o teste de vazio, um `getEmail()` nulo
       comparado a `""` passaria -- mesma armadilha já escrita em
       `podeExcluirSubgrupo`. */
    comoUser("");
    mocks.detalhesDocumento.mockResolvedValue({ ...DOCUMENTO, criado_por: "" });
    montar();
    await carregada();

    expect(screen.queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
  });
});
