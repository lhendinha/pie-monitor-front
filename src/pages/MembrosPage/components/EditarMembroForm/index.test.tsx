import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderComProviders } from "../../../../test/queryTestUtils";
import type { Grupo, Membro, Subgrupo } from "../../../../types";

const mocks = vi.hoisted(() => ({
  listarTodosOsMembrosDoGrupo: vi.fn(),
  listarSubgruposDoGrupo: vi.fn(),
  atualizarMembro: vi.fn(),
  getGrupoId: vi.fn(),
}));

vi.mock("../../../../services", () => mocks);

import EditarMembroForm from "./index";
import { FALHOU_AO_CONFERIR_SUBGRUPOS } from "../../../../constants/subgrupos";

// Dois grupos: o teste de destravar precisa ter pra onde trocar.
const grupos: Grupo[] = [
  { grupo_id: "g1", nome: "Grupo 1" },
  { grupo_id: "g2", nome: "Grupo 2" },
];
const subgrupos: Subgrupo[] = [{ subgrupo_id: "s1", nome: "Subgrupo 1", grupo_id: "g1" }];

function montarMembro(overrides: Partial<Membro> = {}): Membro {
  return { email: "fulano@x.com", apelido: "Fulano", papel: "user", subgrupos: ["s1"], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getGrupoId.mockReturnValue("g1");
  mocks.listarSubgruposDoGrupo.mockResolvedValue({ subgrupos });
});

describe("EditarMembroForm", () => {
  it("sem nenhum subgrupo, a instrução vira alerta e o Salvar trava", async () => {
    // Sem subgrupo, a pessoa fica com conta ativa e sem enxergar processo
    // nenhum -- o servidor recusa (`SubgruposObrigatorios`), e aqui o botão
    // nem chega a ficar clicável.
    const membro = montarMembro({ subgrupos: [] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha pelo menos um subgrupo.");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("com subgrupo, a mesma frase fica só como instrução", async () => {
    // O texto não muda porque a instrução não muda -- só a urgência dela.
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    expect(screen.getByText("Escolha pelo menos um subgrupo.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submete a atualização com os campos do formulário", async () => {
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockResolvedValue({ membros: [membro] });
    mocks.atualizarMembro.mockResolvedValue({});
    const onAtualizado = vi.fn();
    const onFechar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={onAtualizado} onFechar={onFechar} />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mocks.atualizarMembro).toHaveBeenCalledWith("fulano@x.com", {
        apelido: "Fulano",
        grupo_id: "g1",
        papel: "user",
        subgrupos: ["s1"],
      })
    );
    expect(onAtualizado).toHaveBeenCalled();
    expect(onFechar).toHaveBeenCalled();
  });
});

describe("conferência dos subgrupos atuais", () => {
  it("🔴 falha ao conferir TRAVA o salvar, em vez de salvar o conjunto velho", async () => {
    /* O efeito anti-staleness usava `.then().finally()` SEM `.catch()`. O
     * `.finally` não converte rejeição: virava unhandled promise rejection,
     * nada aparecia pra pessoa, e `subgruposCarregados` virava `true` do
     * mesmo jeito -- o Salvar destravava com o conjunto VELHO da prop.
     *
     * O servidor reconcilia pelo conjunto exato enviado e solta as tarefas
     * de quem sai. Então um blip de rede num "Editar" aberto só pra corrigir
     * o apelido tirava a pessoa de um subgrupo que alguém tinha acabado de
     * adicionar, e as tarefas dela lá ficavam sem responsável. Sem aviso. */
    const membro = montarMembro({ subgrupos: ["s1"] });
    mocks.listarTodosOsMembrosDoGrupo.mockRejectedValue(new Error("rede caiu"));
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    expect(
      await screen.findByText(/Não foi possível conferir os subgrupos atuais/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Salvar/ })).toBeDisabled(),
    );
  });

  it("🔴 trocar de grupo limpa o bloqueio deixado por uma falha na recarga", async () => {
    /* `falhouAoRecarregar` bloqueia o Salvar porque a seleção pode estar
     * velha -- e enviar dado velho REMOVE a pessoa de subgrupos que alguém
     * acabou de adicionar. Mas nunca era limpo, e o efeito que o define só
     * reage a `[membro.email]`: um blip de rede travava o formulário até
     * fechar e reabrir o modal.
     *
     * Trocar o grupo descarta a seleção antiga, então o motivo do bloqueio
     * deixa de existir. */
    const membro = montarMembro();
    mocks.listarTodosOsMembrosDoGrupo.mockRejectedValue(new Error("rede"));
    const user = userEvent.setup();
    renderComProviders(
      <EditarMembroForm membro={membro} grupos={grupos} onAtualizado={vi.fn()} onFechar={vi.fn()} />
    );

    /* O aviso de "não consegui conferir" é o que o flag controla -- e é
     * ele que pode ser observado. O botão Salvar NÃO serve de sonda aqui:
     * trocar de grupo esvazia a seleção de subgrupos, então ele continua
     * desabilitado por outro motivo, legítimo. */
    expect(await screen.findByText(FALHOU_AO_CONFERIR_SUBGRUPOS)).toBeInTheDocument();

    /* ⚠️ O `Select` do projeto NÃO é um `<select>` nativo -- é um combobox
     * próprio (`Select.tsx`: "Substitui o `<select>` nativo"). O
     * `selectOptions` do user-event não funciona nele; abre e clica na
     * opção, como o teste do próprio componente faz. */
    await user.click(screen.getByText(grupos[0].nome));
    await user.click(await screen.findByText(grupos[1].nome));

    await waitFor(() =>
      expect(screen.queryByText(FALHOU_AO_CONFERIR_SUBGRUPOS)).not.toBeInTheDocument(),
    );
  });
});
