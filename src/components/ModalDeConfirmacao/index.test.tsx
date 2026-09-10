/** O diálogo de confirmação, isolado.
 *
 * 🔴 Existia sem teste próprio -- só as telas o cobriam. Ganhou este arquivo
 * quando concluir em lote passou a usá-lo: a primeira confirmação que NÃO é
 * de exclusão, e que por isso precisa não dizer "Excluindo…" nem pintar o
 * botão de vermelho.
 */
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import ModalDeConfirmacao from "./index";
import type { ModalDeConfirmacaoProps } from "./types";

function montar(extra: Partial<ModalDeConfirmacaoProps> = {}) {
  const props: ModalDeConfirmacaoProps = {
    titulo: "Excluir 1 tarefa",
    mensagem: "Você vai excluir uma tarefa.",
    onConfirmar: vi.fn(),
    onFechar: vi.fn(),
    ...extra,
  };
  renderComProviders(<ModalDeConfirmacao {...props} />);
  return props;
}

describe("ModalDeConfirmacao", () => {
  it("por padrão é a confirmação de EXCLUSÃO: botão de perigo e o aviso de irreversível", () => {
    montar();
    expect(screen.getByRole("button", { name: "Excluir" })).toHaveAttribute("data-variante", "perigo");
    expect(screen.getByText("Essa ação não pode ser desfeita.")).toBeInTheDocument();
  });

  it("enquanto confirma, diz 'Excluindo…' quando ninguém disse outra coisa", () => {
    montar({ confirmando: true });
    expect(screen.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
  });

  it("🔴 `rotuloConfirmando` troca o 'Excluindo…' -- concluir não pode dizer excluir", () => {
    montar({ confirmando: true, rotuloConfirmando: "Concluindo…" });
    expect(screen.getByRole("button", { name: "Concluindo…" })).toBeInTheDocument();
    expect(screen.queryByText("Excluindo…")).not.toBeInTheDocument();
  });

  it("🔴 `varianteDoBotao` pinta o primário", () => {
    montar({ rotulo: "Concluir 3", varianteDoBotao: "primario" });
    expect(screen.getByRole("button", { name: "Concluir 3" })).toHaveAttribute("data-variante", "primario");
  });

  it("⚠️ o par: `reversivel` sozinho MANTÉM o vermelho -- quatro telas dependem disso", () => {
    /* Fatura, opções do grupo, membros e lançamento usam `reversivel` com o
       botão de perigo. Derivar a cor da prop mudaria as quatro. */
    montar({ rotulo: "Desativar", reversivel: true });
    expect(screen.getByRole("button", { name: "Desativar" })).toHaveAttribute("data-variante", "perigo");
  });

  it("reversível troca o 'não pode ser desfeita' pela nota de COMO se volta", () => {
    montar({ reversivel: true, nota: "Dá para reabrir depois." });
    expect(screen.queryByText("Essa ação não pode ser desfeita.")).not.toBeInTheDocument();
    expect(screen.getByText("Dá para reabrir depois.")).toBeInTheDocument();
  });

  it("⚠️ a nota é ignorada numa ação irreversível -- ali a frase é fixa", () => {
    montar({ nota: "Dá para reabrir depois." });
    expect(screen.queryByText("Dá para reabrir depois.")).not.toBeInTheDocument();
    expect(screen.getByText("Essa ação não pode ser desfeita.")).toBeInTheDocument();
  });

  it("confirmar e cancelar chamam quem devem", async () => {
    const user = userEvent.setup();
    const props = montar({ rotulo: "Concluir 3" });
    await user.click(screen.getByRole("button", { name: "Concluir 3" }));
    expect(props.onConfirmar).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onFechar).toHaveBeenCalled();
  });
});
