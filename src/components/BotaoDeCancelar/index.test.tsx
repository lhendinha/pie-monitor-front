import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import BotaoDeCancelar from "./index";
import Modal from "../Modal";
import RodapeDeAcoes from "../RodapeDeAcoes";

/** O mesmo arnês do `Modal`: um campo só, para sujar DEPOIS da montagem. */
function FormularioNoModal({
  onFechar,
  desabilitado,
}: {
  onFechar: () => void;
  desabilitado?: boolean;
}) {
  const [texto, setTexto] = useState("");
  return (
    <Modal
      titulo="Nova tarefa"
      onFechar={onFechar}
      descarte={{ mudou: texto !== "" }}
      rodape={
        <RodapeDeAcoes>
          <BotaoDeCancelar desabilitado={desabilitado} />
        </RodapeDeAcoes>
      }
    >
      <label htmlFor="titulo">Título</label>
      <input id="titulo" value={texto} onChange={(e) => setTexto(e.target.value)} />
    </Modal>
  );
}

const cancelar = () => screen.getByRole("button", { name: "Cancelar" });

describe("BotaoDeCancelar", () => {
  it("🔴 com o formulário mexido, PERGUNTA em vez de fechar", async () => {
    /* É o quarto caminho de fechamento, e o único que o `Modal` não desenha:
       o rodapé é um `ReactNode` do chamador. Sem o contexto, este botão
       fecharia direto e levaria o que foi digitado. */
    const usuario = userEvent.setup();
    const onFechar = vi.fn();
    renderComProviders(<FormularioNoModal onFechar={onFechar} />);
    await usuario.type(screen.getByLabelText("Título"), "a");

    await usuario.click(cancelar());

    expect(screen.getByText("Sair sem salvar?")).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });

  it("INTACTO, fecha direto", async () => {
    /* O par negativo: sem ele, "pergunta sempre" passaria. */
    const usuario = userEvent.setup();
    const onFechar = vi.fn();
    renderComProviders(<FormularioNoModal onFechar={onFechar} />);

    await usuario.click(cancelar());

    expect(screen.queryByText("Sair sem salvar?")).not.toBeInTheDocument();
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it("⚠️ aceita `desabilitado` -- o `ModalDaInscricao` trava durante o salvamento", async () => {
    /* Não é firula: aquele modal já fazia isso com o `Botao` cru, e perder o
       comportamento na migração seria regressão silenciosa. */
    renderComProviders(<FormularioNoModal onFechar={vi.fn()} desabilitado />);

    expect(cancelar()).toBeDisabled();
  });

  it("🔴 fora de um `Modal`, LANÇA", async () => {
    /* Erro na hora é melhor que um botão que não faz nada e ninguém entende
       por quê. Como o botão não aceita `onClick`, esta é a única forma de o
       chamador errar. */
    const silencio = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderComProviders(<BotaoDeCancelar />)).toThrow(
      /precisa estar dentro de um <Modal>/,
    );

    silencio.mockRestore();
  });
});
