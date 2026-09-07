import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import CampoDeValor from ".";

/** O campo controlado, como um formulário o usaria -- é o que faz a máscara
 * aparecer: sem o estado de volta, o valor digitado nunca é reescrito. */
function Formulario({ aoMudar }: { aoMudar?: (v: number | null) => void }) {
  const [valor, setValor] = useState<number | null>(null);
  return (
    <CampoDeValor
      id="valor"
      valor={valor}
      onMudar={(v) => {
        setValor(v);
        aoMudar?.(v);
      }}
    />
  );
}

function campo() {
  return screen.getByRole("textbox");
}

describe("CampoDeValor", () => {
  it("🔴 conta da DIREITA para a esquerda, como caixa eletrônico", async () => {
    const user = userEvent.setup();
    renderComProviders(<Formulario />);
    await user.type(campo(), "1");
    expect(campo()).toHaveValue("0,01");
    await user.type(campo(), "2");
    expect(campo()).toHaveValue("0,12");
    await user.type(campo(), "34");
    expect(campo()).toHaveValue("12,34");
  });

  it("`1.234,56` digitado vira 123456 centavos", async () => {
    /* ⚠️ Os separadores que a pessoa digita são ignorados: só os dígitos
       contam, e a máscara os recoloca. O resultado é o mesmo de quem digita
       só os números. */
    const aoMudar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<Formulario aoMudar={aoMudar} />);
    await user.type(campo(), "1.234,56");
    expect(campo()).toHaveValue("1.234,56");
    expect(aoMudar).toHaveBeenLastCalledWith(123456);
  });

  it("⚠️ letra não entra, e o valor não se perde", async () => {
    /* Um campo que pisca vermelho porque alguém encostou no "a" ensina menos
       que um que ignora. */
    const user = userEvent.setup();
    renderComProviders(<Formulario />);
    await user.type(campo(), "50");
    await user.type(campo(), "abc");
    expect(campo()).toHaveValue("0,50");
  });

  it("⚠️ o sinal também não entra: quantia é positiva", async () => {
    /* Quem decide se aparece como −480,00 é a tela, que sabe a natureza do
       lançamento -- formatar já com o sinal faria a mesma quantia imprimir
       diferente conforme o caminho até ela. */
    const aoMudar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<Formulario aoMudar={aoMudar} />);
    await user.type(campo(), "-480");
    expect(aoMudar).toHaveBeenLastCalledWith(480);
  });

  it("🔴 apagar tudo devolve `null`, e não zero", async () => {
    /* Vazio e "zero reais" são coisas diferentes: devolver 0 faria o
       formulário aceitar um lançamento sem valor achando que alguém quis
       zero. */
    const aoMudar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<Formulario aoMudar={aoMudar} />);
    await user.type(campo(), "123");
    await user.clear(campo());
    expect(aoMudar).toHaveBeenLastCalledWith(null);
    expect(campo()).toHaveValue("");
  });

  it("o valor que vem de fora aparece formatado", () => {
    renderComProviders(<CampoDeValor id="v" valor={800000} onMudar={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("8.000,00");
  });

  it("⚠️ `R$` é prefixo da caixa, não texto digitável", () => {
    /* Dentro do valor ele viraria caractere para apagar por engano. */
    renderComProviders(<CampoDeValor id="v" valor={123} onMudar={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("1,23");
    expect(screen.getByText("R$")).toBeInTheDocument();
  });

  it("não é `type=number`: sem setas e sem `e`", () => {
    /* O número do HTML aceita `e` e `-`, e no celular abre um teclado com
       vírgula que a máscara ignoraria. */
    renderComProviders(<CampoDeValor id="v" valor={null} onMudar={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "numeric");
  });
});
