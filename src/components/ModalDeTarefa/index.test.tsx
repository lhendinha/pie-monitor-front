import { screen } from "@testing-library/react";
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
