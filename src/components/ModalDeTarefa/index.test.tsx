import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";

const mocks = vi.hoisted(() => ({
  criarTarefa: vi.fn(),
  atualizarTarefa: vi.fn(),
  removerTarefa: vi.fn(),
  listarQuadro: vi.fn(),
  listarMembrosDoSubgrupo: vi.fn(),
  listarSubgrupos: vi.fn(),
  listarProcessos: vi.fn(),
  listarAtendimentos: vi.fn(),
  listarClientes: vi.fn(),
}));

vi.mock("../../services", () => mocks);

import ModalDeTarefa from "./index";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarQuadro.mockResolvedValue({
    colunas: [{ coluna_id: "c1", nome: "A fazer", ordem: 1 }],
  });
  mocks.listarMembrosDoSubgrupo.mockResolvedValue({ membros: [] });
  mocks.listarSubgrupos.mockResolvedValue({
    subgrupos: [{ subgrupo_id: "s1", nome: "Cível", grupo_id: "g1" }],
  });
  mocks.listarProcessos.mockResolvedValue({ processos: [] });
  mocks.listarAtendimentos.mockResolvedValue({ atendimentos: [] });
  mocks.listarClientes.mockResolvedValue({ clientes: [] });
});

function montar() {
  renderComProviders(
    <MemoryRouter>
      <ModalDeTarefa subgrupoAtual="s1" onSalvo={vi.fn()} onFechar={vi.fn()} />
    </MemoryRouter>,
  );
}

/** 🔴 A promoção de `VinculoDaTarefa` pra `components/VinculoDeRegistro`
 * não pode mudar ESTA tela.
 *
 * O plano previa que o campo promovido ganhasse um "slot opcional de
 * cliente", desligado aqui. A decisão mudou na implementação -- `cliente`
 * não entrou no campo de jeito nenhum, porque `CampoDeClientes` já resolve
 * isso e as cardinalidades não batem (processo e atendimento são um cada;
 * cliente é lista). O motivo está escrito em `VinculoDeRegistro`.
 *
 * O que este teste trava é o resultado, que vale nas duas versões da
 * decisão: a tela de tarefa continua exatamente como estava.
 */
describe("a promoção do campo de vínculo não mudou a tarefa", () => {
  it("🔴 não ganhou campo de clientes", () => {
    montar();
    expect(screen.queryByLabelText(/^Clientes/)).not.toBeInTheDocument();
  });

  it("continua com o campo de vínculo, e ele busca processo E atendimento", () => {
    montar();
    const campo = screen.getByLabelText(/Processo ou atendimento vinculado/);
    expect(campo).toHaveAttribute("placeholder", "Encontre um processo ou atendimento");
  });
});

describe("vinculoInicial", () => {
  const PROCESSO = {
    tipo: "processo" as const,
    id: "90000000000000000000",
    rotulo: "9000000-00.0000.0.00.0000",
  };

  function montarCom(props: Record<string, unknown>) {
    renderComProviders(
      <MemoryRouter>
        <ModalDeTarefa subgrupoAtual="s1" onSalvo={vi.fn()} onFechar={vi.fn()} {...props} />
      </MemoryRouter>,
    );
  }

  it("🔴 abre com o processo já vinculado -- é o ponto todo do botão", async () => {
    /* Um botão que abrisse o modal vazio não ganharia nada: a pessoa teria
       de procurar o processo de novo, dentro de um modal aberto A PARTIR
       dele. */
    montarCom({ vinculoInicial: PROCESSO });

    expect(await screen.findByText("9000000-00.0000.0.00.0000")).toBeInTheDocument();
  });

  it("🔴 mostra o RÓTULO, não o número cru", async () => {
    /* `VinculoDeRegistro` mostra a etiqueta do que foi vinculado, e um CNJ
       de 20 dígitos sem máscara não se confere de relance. */
    montarCom({ vinculoInicial: PROCESSO });

    expect(await screen.findByText("9000000-00.0000.0.00.0000")).toBeInTheDocument();
    expect(screen.queryByText("90000000000000000000")).not.toBeInTheDocument();
  });

  it("sem a prop, abre sem vínculo nenhum -- os outros chamadores não mudam", async () => {
    montarCom({});

    expect(await screen.findByPlaceholderText(/Encontre um processo/)).toBeInTheDocument();
    expect(screen.queryByText("9000000-00.0000.0.00.0000")).not.toBeInTheDocument();
  });

  it("🔴 EDITAR tem precedência: o vínculo da tarefa vence o inicial", async () => {
    /* Sem essa precedência, abrir uma tarefa já vinculada a partir da tela
       de OUTRO processo trocaria o vínculo dela em silêncio -- e salvar
       gravaria a troca. */
    montarCom({
      tarefa: {
        tarefa_id: "t1",
        subgrupo_id: "s1",
        titulo: "Já existe",
        data: "2026-08-27",
        prioridade: "media",
        coluna_id: "c1",
        processo_numero: "11111111111111111111",
      },
      vinculoInicial: PROCESSO,
    });

    expect(await screen.findByText("1111111-11.1111.1.11.1111")).toBeInTheDocument();
    expect(screen.queryByText("9000000-00.0000.0.00.0000")).not.toBeInTheDocument();
  });

  it("vínculo de ATENDIMENTO cai na fatia certa", async () => {
    montarCom({
      vinculoInicial: { tipo: "atendimento", id: "a1", rotulo: "Atendimento de Fulano" },
    });

    expect(await screen.findByText("Atendimento de Fulano")).toBeInTheDocument();
  });
});

// ── 🔴 a guarda de descarte, com o quadro chegando DEPOIS ─────────────────

/** Aqui o modal monta com o cache FRIO -- `listarQuadro` é assíncrono, ao
 * contrário do que acontece no Kanban, onde a página já buscou o quadro e a
 * query do modal resolve na primeira renderização. É esta a situação que
 * separa uma guarda correta de uma que suja sozinha. */
describe("guarda de descarte", () => {
  const perguntou = () => screen.queryByText("Sair sem salvar?") !== null;
  const seletorDeColuna = () => screen.getByLabelText(/Coluna do quadro/);

  it("🔴 a coluna que chega do QUADRO não conta como mudança", async () => {
    /* `colunaEscolhida` é `""` até a query responder, e vira a primeira
       coluna quando ela chega. Sem avisar o retrato (`resemear`), essa
       chegada sozinha marcaria a tarefa como alterada -- e quem só abriu para
       olhar seria interrogado ao sair. */
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("A fazer"); // o quadro chegou

    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
  });

  it("🔴 re-escolher a coluna que JÁ aparecia marcada não conta", async () => {
    /* O outro lado do mesmo problema, e a razão de a projeção usar o valor do
       ENVIO. O estado cru (`colunaId`) nasce `""` enquanto a tela já mostra a
       primeira coluna; escolhê-la no seletor mudaria `""` -> `"c1"` e
       perguntaria por uma mudança que ninguém vê. */
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("A fazer");

    await usuario.click(seletorDeColuna());
    await usuario.click(await screen.findByRole("option", { name: "A fazer" }));
    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
  });

  it("🔴 tirar o vínculo de ATENDIMENTO pergunta -- ele entra na projeção", async () => {
    /* O par que guarda a segunda metade do vínculo. `VinculosDeRegistro` tem
       DOIS ninhos, e projetar só `processoNumero` deixaria a remoção do
       atendimento passar em silêncio -- justamente o campo que o envio manda
       como `null` para DESFAZER o vínculo. */
    const usuario = userEvent.setup();
    renderComProviders(
      <MemoryRouter>
        <ModalDeTarefa
          subgrupoAtual="s1"
          vinculoInicial={{ tipo: "atendimento", id: "at-1", rotulo: "Reunião inicial" }}
          onSalvo={vi.fn()}
          onFechar={vi.fn()}
        />
      </MemoryRouter>,
    );
    await screen.findByText("A fazer");

    await usuario.click(screen.getByRole("button", { name: /Remover Atendimento/ }));
    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(true);
  });

  it("digitar o título pergunta", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("A fazer");

    await usuario.type(screen.getByLabelText(/Descrição da tarefa/), "Peticionar");
    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(true);
  });
});
