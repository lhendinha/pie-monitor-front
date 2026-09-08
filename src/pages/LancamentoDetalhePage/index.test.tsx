import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  detalheLancamento: vi.fn(),
  contarASerie: vi.fn(),
  atualizarLancamento: vi.fn(),
  efetivarLancamento: vi.fn(),
  reabrirLancamento: vi.fn(),
  excluirLancamento: vi.fn(),
  lerCatalogoFinanceiro: vi.fn(),
  detalheCliente: vi.fn(),
  /* ⚠️ O catálogo de subgrupos alimenta o campo de departamento; os membros,
     o de responsável. Sem eles as consultas erram em silêncio e os campos
     ficam vazios -- o teste passaria sem exercitar o caminho real. */
  listarSubgrupos: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  getEmail: vi.fn(),
  papelAtende: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import LancamentoDetalhePage from "./index";

const LANCAMENTO = {
  lancamento_id: "l1",
  tipo: "honorario",
  descricao: "Honorários Alfa 2/3",
  valor_centavos: 250000,
  data_vencimento: "2026-09-20",
  situacao: "aberto",
  natureza: "entrada",
  conta_id: "ct1",
  categoria_id: "cat1",
  centro_id: "",
  rateio: [{ subgrupo_id: "s1", valor_centavos: 250000 }],
  cliente_id: "",
  contraparte: "Construtora Alfa",
  subgrupo_id: "s1",
  numero_processo: "",
  atendimento_id: "",
  responsavel: "ana@x.com",
  documento_numero: "",
  parcela: "2/3",
  criado_por: "ana@x.com",
  criado_em: "2026-09-01T10:00:00+00:00",
};

const CATALOGO = {
  contas: [
    { conta_id: "ct1", nome: "Itaú — corrente", tipo: "corrente", inicio: "2026-01-01",
      saldo_inicial_centavos: 0, saldo_centavos: 0, ativa: true },
  ],
  categorias: [
    { categoria_id: "cat1", nome: "Honorários contratuais", natureza: "entrada",
      cor: "#1f9d55", agrupador_id: "", ativa: true },
  ],
  centros_de_custo: [{ centro_id: "cc1", nome: "Filial BH", ativo: true }],
  conta_padrao_id: "ct1",
  cores_disponiveis: ["#1f9d55"],
};

function Espiao() {
  const { pathname, search } = useLocation();
  return <div data-testid="url">{pathname + search}</div>;
}

function montar(rota = "/financeiro/lancamentos/l1") {
  return renderComProviders(
    <MemoryRouter initialEntries={[rota]}>
      <Espiao />
      <Routes>
        <Route path="/financeiro" element={<div>lista de lançamentos</div>} />
        <Route
          path="/financeiro/lancamentos/:lancamentoId"
          element={<LancamentoDetalhePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const url = () => screen.getByTestId("url").textContent ?? "";

async function carregada(descricao = LANCAMENTO.descricao) {
  return await screen.findByRole("heading", { name: descricao });
}

/** Abre o diálogo de exclusão e devolve o botão que confirma.
 *
 * ⚠️ "Excluir" existe DUAS vezes com o diálogo aberto (o da página e o do
 * rodapé); o último é o do diálogo, que monta depois. */
async function abrirExclusao() {
  await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
  const botoes = await screen.findAllByRole("button", { name: /Excluir/ });
  return botoes[botoes.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO });
  mocks.contarASerie.mockResolvedValue({ abertos_a_frente: 2 });
  mocks.atualizarLancamento.mockResolvedValue({ lancamento_id: "l1", atualizados: 1 });
  mocks.efetivarLancamento.mockResolvedValue({ lancamento_id: "l1" });
  mocks.reabrirLancamento.mockResolvedValue({ lancamento_id: "l1" });
  mocks.excluirLancamento.mockResolvedValue({ lancamento_id: "l1", removidos: 1 });
  mocks.lerCatalogoFinanceiro.mockResolvedValue(CATALOGO);
  mocks.detalheCliente.mockResolvedValue({ cliente_id: "c1", nome: "Construtora Alfa" });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [
      { subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" },
      { subgrupo_id: "s2", nome: "Trabalhista", grupo_id: "g1" },
    ],
  });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({
    membros: [{ email: "ana@x.com", apelido: "Ana" }],
  });
  mocks.getEmail.mockReturnValue("ana@x.com");
  /* O padrão é `admin`: os testes exercitam o comportamento da tela, não a
     permissão. Quem testa a permissão a declara. */
  mocks.papelAtende.mockReturnValue(true);
});

describe("hidratação", () => {
  it("🔴 se carrega SOZINHA pelo id da URL", async () => {
    montar();
    await carregada();
    expect(mocks.detalheLancamento).toHaveBeenCalledWith("l1");
  });

  it("link velho aponta pra lançamento excluído -- diz isso, e não fica tentando", async () => {
    mocks.detalheLancamento.mockRejectedValue(new Error("não encontrado"));
    montar();
    expect(await screen.findByText(/pode ter sido excluído/)).toBeInTheDocument();
    expect(mocks.detalheLancamento).toHaveBeenCalledTimes(1);
  });

  it("🔴 os campos nascem PREENCHIDOS com o que veio", async () => {
    montar();
    await carregada();
    expect(screen.getByLabelText<HTMLInputElement>(/^Descrição/).value).toBe(
      "Honorários Alfa 2/3",
    );
    expect(screen.getByLabelText<HTMLInputElement>(/^Valor/).value).toBe("2.500,00");
    expect(screen.getByLabelText<HTMLInputElement>(/Recebida de/).value).toBe(
      "Construtora Alfa",
    );
    expect(await screen.findByText("Honorários contratuais")).toBeInTheDocument();
    expect(await screen.findByText("Itaú — corrente")).toBeInTheDocument();
    expect(await screen.findByText("Cível")).toBeInTheDocument();
  });
});

describe("as etiquetas do cabeçalho", () => {
  it("🔴 a PARCELA não vira etiqueta: o título já a carrega", async () => {
    /* O servidor escreve "· 2/3" no fim da descrição, e a descrição é o
       título. "Parcela 2/3" ao lado repetia o número na mesma dobra. */
    montar();
    await carregada();
    expect(screen.queryByText(/^Parcela /)).not.toBeInTheDocument();
  });

  it("na REPETIÇÃO mensal, a etiqueta de série aparece", async () => {
    /* Ela tem irmãos e NÃO tem numeração ("o mesmo aluguel todo mês"), então
       é o único sinal de que existe série. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, parcela: "", recorrencia_id: "r1", descricao: "Aluguel",
    });
    montar();
    await carregada("Aluguel");
    expect(screen.getByText("Faz parte de uma série")).toBeInTheDocument();
  });

  it("na PARCELA, não -- o par negativo", async () => {
    mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO, recorrencia_id: "r1" });
    montar();
    await carregada();
    expect(screen.queryByText("Faz parte de uma série")).not.toBeInTheDocument();
  });
});

describe("o que NÃO se edita", () => {
  it("🔴 situação e vínculo vêm travados", async () => {
    /* Situação é ação (move o saldo, e quem a muda é "Marcar como
       recebido"); o vínculo carrega a permissão e não está no PATCH.
       Editáveis, os dois prometeriam o que falha ao salvar. */
    montar();
    await carregada();
    expect(screen.getByLabelText<HTMLInputElement>(/^Situação/)).toBeDisabled();
    expect(screen.getByLabelText<HTMLInputElement>(/Processo ou atendimento/)).toBeDisabled();
  });

  it("🔴 o VENCIMENTO, esse, é editável", async () => {
    /* O par negativo do de cima, e a diferença que importa: o vencimento
       entrou no PATCH, e a série o propaga reancorado. */
    montar();
    await carregada();
    expect(screen.getByLabelText(/A receber em/)).toBeEnabled();
  });

  it("🔴 a data de EFETIVAÇÃO continua travada, e é outro campo", async () => {
    /* Uma é quando devia acontecer, a outra é quando aconteceu -- e a
       segunda se move por "Desfazer baixa", com o saldo junto. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.getByLabelText(/A receber em/)).toBeEnabled();
    expect(screen.getByLabelText<HTMLInputElement>(/Recebida em/)).toBeDisabled();
  });

  it("na TRANSFERÊNCIA o vencimento volta a ser travado", async () => {
    /* A data dela É a data em que o dinheiro se moveu; a API recusa com
       400, e a tela não oferece o que ele nega. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, tipo: "transferencia", natureza: "",
      situacao: "efetivado", data_efetivacao: "2026-09-05", rateio: [],
    });
    montar();
    await carregada();
    expect(screen.getByLabelText<HTMLInputElement>(/Vencimento/)).toBeDisabled();
  });

  it("descrição, valor e contraparte SÃO editáveis -- o par negativo", async () => {
    montar();
    await carregada();
    expect(screen.getByLabelText<HTMLInputElement>(/^Descrição/)).toBeEnabled();
    expect(screen.getByLabelText<HTMLInputElement>(/^Valor/)).toBeEnabled();
    expect(screen.getByLabelText<HTMLInputElement>(/Recebida de/)).toBeEnabled();
  });

  it("🔴 com CLIENTE, a contraparte vira leitura", async () => {
    /* `cliente_id` não está no PATCH: é por ele que a fatura agrupa. */
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, cliente_id: "c1", contraparte: "",
    });
    montar();
    await carregada();
    const campo = await screen.findByLabelText<HTMLInputElement>(/Recebida de/);
    expect(campo).toBeDisabled();
    await waitFor(() => expect(campo.value).toBe("Construtora Alfa"));
    expect(mocks.detalheCliente).toHaveBeenCalledWith("c1");
  });

  it("sem cliente, ninguém vai buscar cliente nenhum", async () => {
    montar();
    await carregada();
    expect(mocks.detalheCliente).not.toHaveBeenCalled();
  });
});

describe("salvar", () => {
  it("🔴 manda SÓ o que mudou", async () => {
    montar();
    await carregada();
    const descricao = screen.getByLabelText(/^Descrição/);
    await userEvent.clear(descricao);
    await userEvent.type(descricao, "Honorários Alfa · corrigido");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    const [id, campos] = mocks.atualizarLancamento.mock.calls[0];
    expect(id).toBe("l1");
    expect(campos).toEqual({ descricao: "Honorários Alfa · corrigido" });
  });

  it("🔴 mudar o VALOR manda o rateio junto", async () => {
    /* A soma das parcelas tem de bater com o valor: sem o rateio, o servidor
       gravaria 200 com a invariante quebrada -- e o relatório por
       departamento passaria a discordar do total. */
    montar();
    await carregada();
    const valor = screen.getByLabelText(/^Valor/);
    await userEvent.clear(valor);
    await userEvent.type(valor, "300000");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    const campos = mocks.atualizarLancamento.mock.calls[0][1];
    expect(campos.valor_centavos).toBe(300000);
    expect(campos.rateio).toEqual([{ subgrupo_id: "s1" }]);
  });

  it("nada mudou: nem chama o servidor", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByText("Nada mudou.")).toBeInTheDocument());
    expect(mocks.atualizarLancamento).not.toHaveBeenCalled();
  });

  it("campo obrigatório vazio não vai para o servidor", async () => {
    montar();
    await carregada();
    await userEvent.clear(screen.getByLabelText(/^Descrição/));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Informe a descrição.")).toBeInTheDocument();
    expect(mocks.atualizarLancamento).not.toHaveBeenCalled();
  });

  it("🔴 lançamento ANTIGO, sem rateio, não salva sem departamento", async () => {
    /* `[].some()` é `false`: sem a metade que checa a lista vazia, um
       lançamento criado antes de o rateio existir passava pelo campo
       obrigatório sem ninguém escolher nada. */
    mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO, rateio: [] });
    montar();
    await carregada();
    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Escolha o departamento.")).toBeInTheDocument();
    expect(mocks.atualizarLancamento).not.toHaveBeenCalled();
  });

  it("🔴 esvaziar a contraparte não vai para o servidor", async () => {
    /* Cliente OU contraparte, nunca nenhum dos dois -- é a régua do
       servidor, e o 400 dela chegaria depois de a pessoa já ter apagado. */
    montar();
    await carregada();
    await userEvent.clear(screen.getByLabelText(/Recebida de/));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Informe de quem veio ou para quem foi."),
    ).toBeInTheDocument();
    expect(mocks.atualizarLancamento).not.toHaveBeenCalled();
  });

  it("com CLIENTE, a contraparte vazia não impede nada -- o par negativo", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, cliente_id: "c1", contraparte: "",
    });
    montar();
    await carregada();
    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
  });

  it("🔴 a recusa do servidor aparece no FORMULÁRIO", async () => {
    const { ApiError } = await import("../../services/api/client");
    mocks.atualizarLancamento.mockRejectedValue(
      new ApiError("Conta desativada: escolha outra", 400),
    );
    montar();
    await carregada();
    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Conta desativada: escolha outra")).toBeInTheDocument();
  });
});

describe("a série", () => {
  const NA_SERIE = { ...LANCAMENTO, recorrencia_id: "r1" };

  it("🔴 salvar num AVULSO não pergunta nada", async () => {
    montar();
    await carregada();
    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    expect(mocks.atualizarLancamento.mock.calls[0][2]).toBe("este");
  });

  it("🔴 numa SÉRIE, pergunta até onde vai", async () => {
    mocks.detalheLancamento.mockResolvedValue(NA_SERIE);
    montar();
    await carregada();
    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    /* ⚠️ Dentro do DIÁLOGO: a etiqueta do cabeçalho também diz "série", e
       uma busca solta acharia as duas. */
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText(/seguintes em aberto/i)).toBeInTheDocument();
    expect(mocks.atualizarLancamento).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /Este e os próximos 2 em aberto/ }),
    );
    const salvar = screen.getAllByRole("button", { name: /Salvar/ });
    await userEvent.click(salvar[salvar.length - 1]);

    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    expect(mocks.atualizarLancamento.mock.calls[0][2]).toBe("futuros");
  });
});

describe("a pergunta da série só existe quando alcança alguém", () => {
  const NA_SERIE = { ...LANCAMENTO, recorrencia_id: "r1" };

  it("🔴 na ÚLTIMA parcela, salvar não pergunta nada", async () => {
    /* Ela tem `recorrencia_id` e nenhuma irmã à frente: o servidor ignora o
       escopo, e perguntar pediria uma decisão que não muda nada. */
    mocks.detalheLancamento.mockResolvedValue(NA_SERIE);
    mocks.contarASerie.mockResolvedValue({ abertos_a_frente: 0 });
    montar();
    await carregada();
    await waitFor(() => expect(mocks.contarASerie).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Somente este" })).not.toBeInTheDocument();
  });

  it("com UMA à frente, a opção fala no singular", async () => {
    mocks.detalheLancamento.mockResolvedValue(NA_SERIE);
    mocks.contarASerie.mockResolvedValue({ abertos_a_frente: 1 });
    montar();
    await carregada();
    await waitFor(() => expect(mocks.contarASerie).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      await screen.findByRole("button", { name: "Este e o próximo em aberto" }),
    ).toBeInTheDocument();
  });

  it("num AVULSO nem chega a perguntar ao servidor", async () => {
    /* Par negativo: a rota custa uma Query no índice dos abertos, e a maioria
       dos lançamentos não é série. */
    montar();
    await carregada();
    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    expect(mocks.contarASerie).not.toHaveBeenCalled();
  });
});

/** Abre o calendário do vencimento e escolhe um dia do mês seguinte.
 *
 * ⚠️ `SeletorData` é um GATILHO, não um input de texto -- não dá para digitar
 * a data. Um mês à frente garante que a data escolhida difere da atual em
 * qualquer dia do ano. */
async function escolherOutraData() {
  await userEvent.click(screen.getByLabelText(/A receber em/));
  await userEvent.click(await screen.findByRole("button", { name: "Próximo mês" }));
  const dias = await screen.findAllByRole("button", { name: /^Escolher / });
  await userEvent.click(dias[dias.length - 1]);
}

describe("o vencimento", () => {
  it("🔴 mudar a data manda `data_vencimento`, e SOZINHA", async () => {
    /* Ao contrário do valor, que arrasta o rateio: a data não mexe na
       divisão, e quem a transforma para os irmãos é o servidor. */
    montar();
    await carregada();
    await escolherOutraData();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mocks.atualizarLancamento).toHaveBeenCalled());
    const campos = mocks.atualizarLancamento.mock.calls[0][1];
    expect(campos.data_vencimento).toBeTruthy();
    expect(campos.data_vencimento).not.toBe(LANCAMENTO.data_vencimento);
    expect(campos.valor_centavos).toBeUndefined();
    expect(campos.rateio).toBeUndefined();
  });

  it("🔴 numa série, o diálogo avisa o que acontece com as seguintes", async () => {
    /* Sem esta linha a pessoa escolhe "os próximos" achando que vai jogar
       todas no mesmo dia -- que é o que aconteceria sem a reancoragem. */
    mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO, recorrencia_id: "r1" });
    montar();
    await carregada();
    await waitFor(() => expect(mocks.contarASerie).toHaveBeenCalled());

    await escolherOutraData();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    const dialogo = await screen.findByRole("dialog");
    expect(
      within(dialogo).getByText(/mesmo dia do mês, contadas a partir da data nova/),
    ).toBeInTheDocument();
  });

  it("sem mexer na data, o aviso não aparece -- o par negativo", async () => {
    mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO, recorrencia_id: "r1" });
    montar();
    await carregada();
    await waitFor(() => expect(mocks.contarASerie).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/^Descrição/), " x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).queryByText(/mesmo dia do mês/)).not.toBeInTheDocument();
  });
});

describe("dar baixa", () => {
  it("numa ENTRADA aberta, o botão diz 'recebido'", async () => {
    montar();
    await carregada();
    expect(screen.getByRole("button", { name: "Marcar como recebido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como pago" })).not.toBeInTheDocument();
  });

  it("numa SAÍDA aberta, diz 'pago' -- o par negativo", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, natureza: "saida", tipo: "saida",
    });
    montar();
    await carregada();
    expect(screen.getByRole("button", { name: "Marcar como pago" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Marcar como recebido" })).not.toBeInTheDocument();
  });

  it("clicar chama o servidor e recarrega o lançamento", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Marcar como recebido" }));
    await waitFor(() => expect(mocks.efetivarLancamento).toHaveBeenCalledWith("l1"));
    await waitFor(() => expect(mocks.detalheLancamento).toHaveBeenCalledTimes(2));
  });

  it("o servidor recusa -- a tela continua de pé e avisa", async () => {
    mocks.efetivarLancamento.mockRejectedValue(new Error("já efetivado"));
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Marcar como recebido" }));
    expect(await screen.findByText(/Não foi possível registrar a baixa/)).toBeInTheDocument();
    expect(await carregada()).toBeInTheDocument();
  });

  it("🔴 no EFETIVADO some o 'marcar' e aparece 'desfazer'", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: /Marcar como/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desfazer baixa" })).toBeInTheDocument();
  });

  it("efetivado numa ENTRADA rotula a data como 'Recebida em'", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.getByLabelText(/Recebida em/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Paga em/)).not.toBeInTheDocument();
  });

  it("efetivado numa SAÍDA rotula como 'Paga em'", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, natureza: "saida", situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    expect(screen.getByLabelText(/Paga em/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Recebida em/)).not.toBeInTheDocument();
  });
});

describe("o que o servidor NÃO aceitaria não vira botão", () => {
  it("🔴 transferência não efetiva nem reabre -- e a tela diz por quê", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, tipo: "transferencia", natureza: "",
      situacao: "efetivado", data_efetivacao: "2026-09-05", rateio: [],
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: /Marcar como/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer baixa" })).not.toBeInTheDocument();
    /* Duas vezes de propósito: o subtítulo explica a ausência dos botões, e
       a dica do campo Situação explica por que ele está travado. */
    expect(screen.getAllByText(/já nasce efetivada/).length).toBeGreaterThan(0);
    /* E sem categoria nem departamento: ela fica fora do fluxo de caixa. */
    expect(screen.queryByLabelText(/Categoria/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Departamento/)).not.toBeInTheDocument();
  });

  it("🔴 lançamento em FATURA não desfaz baixa nem exclui -- e diz por quê", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05", fatura_id: "f1",
    });
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: "Desfazer baixa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(screen.getByText(/cancele a fatura antes/)).toBeInTheDocument();
  });

  it("sem impedimento, nenhum recado aparece -- o par negativo", async () => {
    montar();
    await carregada();
    expect(screen.queryByText(/cancele a fatura antes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/já nasce efetivada/)).not.toBeInTheDocument();
  });

  it("🔴 quem não é admin não vê 'Excluir'", async () => {
    mocks.papelAtende.mockReturnValue(false);
    montar();
    await carregada();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como recebido" })).toBeInTheDocument();
  });
});

describe("excluir", () => {
  it("pede confirmação antes, e cancelar não chama nada", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/será removido/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() =>
      expect(screen.queryByText(/será removido/)).not.toBeInTheDocument(),
    );
    expect(mocks.excluirLancamento).not.toHaveBeenCalled();
  });

  it("confirmar exclui com escopo 'este' e volta pra lista", async () => {
    montar();
    await carregada();
    await userEvent.click(await abrirExclusao());
    await waitFor(() => expect(mocks.excluirLancamento).toHaveBeenCalledWith("l1", "este"));
    await waitFor(() => expect(url()).toBe("/financeiro?aba=lancamentos"));
  });

  it("🔴 a exclusão FALHA -- a tela não navega e o recado aparece", async () => {
    mocks.excluirLancamento.mockRejectedValue(new Error("está numa fatura"));
    montar();
    await carregada();
    await userEvent.click(await abrirExclusao());
    expect(await screen.findByText(/Não foi possível excluir/)).toBeInTheDocument();
    expect(url()).toBe("/financeiro/lancamentos/l1");
  });

  it("🔴 num EFETIVADO, o aviso fala do SALDO", async () => {
    mocks.detalheLancamento.mockResolvedValue({
      ...LANCAMENTO, situacao: "efetivado", data_efetivacao: "2026-09-05",
    });
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/volta para o saldo da conta/)).toBeInTheDocument();
  });

  it("num aberto, o aviso do saldo não aparece -- o par negativo", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/será removido/)).toBeInTheDocument();
    expect(screen.queryByText(/volta para o saldo da conta/)).not.toBeInTheDocument();
  });

  it("🔴 sem série, a escolha de alcance NÃO é oferecida", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/será removido/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Somente este" })).not.toBeInTheDocument();
  });

  it("🔴 com série, escolher 'os próximos' manda escopo=futuros", async () => {
    mocks.detalheLancamento.mockResolvedValue({ ...LANCAMENTO, recorrencia_id: "r1" });
    mocks.excluirLancamento.mockResolvedValue({ lancamento_id: "l1", removidos: 3 });
    montar();
    await carregada();
    /* ⚠️ Espera a CONTAGEM chegar antes de abrir: é ela que decide se a
       pergunta existe, e sem isto o diálogo abre com "sem série". */
    await waitFor(() => expect(mocks.contarASerie).toHaveBeenCalledWith("l1"));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await userEvent.click(
      await screen.findByRole("button", { name: /Este e os próximos 2 em aberto/ }),
    );
    const botoes = screen.getAllByRole("button", { name: /Excluir/ });
    await userEvent.click(botoes[botoes.length - 1]);
    await waitFor(() => expect(mocks.excluirLancamento).toHaveBeenCalledWith("l1", "futuros"));
  });
});

describe("voltar", () => {
  it("o botão volta para a lista de lançamentos", async () => {
    montar();
    await carregada();
    await userEvent.click(screen.getByRole("button", { name: /Voltar/ }));
    await waitFor(() => expect(url()).toContain("/financeiro"));
  });
});
