import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import { MultiSelect, Select } from ".";

const OPCOES = [
  { value: "a", label: "Cível" },
  { value: "b", label: "Trabalhista" },
];

/** O react-select desenha o texto do controle num nó próprio; buscar pelo
 * texto direto é mais estável que adivinhar a estrutura interna dele. */
function temTexto(texto: string) {
  return screen.queryByText(texto) !== null;
}

describe("Select — estado de carregando", () => {
  it("diz 'Carregando…' no lugar do placeholder", () => {
    renderComProviders(
      <Select opcoes={[]} valor="" onMudar={vi.fn()} placeholder="Selecione" carregando />,
    );
    expect(temTexto("Carregando…")).toBe(true);
    expect(temTexto("Selecione")).toBe(false);
  });

  it("fica TRAVADO enquanto carrega", () => {
    // O ponto todo: lista vazia e clicável faz a pessoa concluir que não
    // existe opção nenhuma. Travado, ela sabe que é espera.
    //
    // A asserção é o `combobox` desabilitado, e não "o menu não abre" por
    // clique simulado: o `react-select` mantém o nó do menu montado e o
    // controle travado ganha `pointer-events: none`, então clicar em teste
    // ou estoura ou mede a coisa errada. O atributo é o contrato de fato --
    // é dele que teclado e leitor de tela dependem.
    renderComProviders(<Select opcoes={OPCOES} valor="" onMudar={vi.fn()} carregando />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("volta ao normal quando as opções chegam", async () => {
    const user = userEvent.setup();
    const onMudar = vi.fn();
    renderComProviders(<Select opcoes={OPCOES} valor="" onMudar={onMudar} placeholder="Selecione" />);

    expect(temTexto("Carregando…")).toBe(false);
    await user.click(screen.getByText("Selecione"));
    await user.click(await screen.findByText("Cível"));
    expect(onMudar).toHaveBeenCalledWith("a");
  });

  it("`desabilitado` e `carregando` são coisas diferentes", () => {
    // `desabilitado` é campo que existe pra ser LIDO (o subgrupo de uma
    // tarefa já criada); `carregando` é espera. Confundir os dois faria o
    // primeiro anunciar "Carregando…" pra sempre.
    renderComProviders(
      <Select
        opcoes={OPCOES}
        valor="a"
        onMudar={vi.fn()}
        desabilitado
      />,
    );
    expect(temTexto("Carregando…")).toBe(false);
    expect(temTexto("Cível")).toBe(true);
  });
});

describe("MultiSelect — estado de carregando", () => {
  it("diz 'Carregando…' no lugar do placeholder", () => {
    renderComProviders(
      <MultiSelect
        opcoes={[]}
        selecionados={[]}
        onMudar={vi.fn()}
        placeholder="Selecione os subgrupos"
        carregando
      />,
    );
    expect(temTexto("Carregando…")).toBe(true);
    expect(temTexto("Selecione os subgrupos")).toBe(false);
  });

  it("fica TRAVADO enquanto carrega", () => {
    renderComProviders(
      <MultiSelect opcoes={OPCOES} selecionados={[]} onMudar={vi.fn()} carregando />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("com as opções chegadas, NÃO fica travado", () => {
    // Controle do teste acima: sem isto ele passaria mesmo se o componente
    // travasse o campo pra sempre.
    renderComProviders(<MultiSelect opcoes={OPCOES} selecionados={[]} onMudar={vi.fn()} />);
    expect(screen.getByRole("combobox")).not.toBeDisabled();
  });

  it("com as opções chegadas, escolhe normalmente", async () => {
    const user = userEvent.setup();
    const onMudar = vi.fn();
    renderComProviders(
      <MultiSelect
        opcoes={OPCOES}
        selecionados={[]}
        onMudar={onMudar}
        placeholder="Selecione os subgrupos"
      />,
    );

    await user.click(screen.getByText("Selecione os subgrupos"));
    await user.click(await screen.findByText("Cível"));
    expect(onMudar).toHaveBeenCalledWith(["a"]);
  });
});

describe("MultiSelect — cor do texto da pílula", () => {
  /* O artifact dá a `.chip-btn` UM `color` (`--slate`), valha ou não filtro,
   * e quem o define é o `control` de `estilosChip`. Pintar o texto de
   * placeholder por cima deixava só Fase e Situação -- os dois MultiSelect
   * da barra de Processos -- mais claros que Clientes e Datas, que chegam na
   * cor por outro caminho. */
  const corDoRotulo = (texto: string) =>
    (screen.getByText(texto) as HTMLElement).style.color;

  it("na pílula, HERDA a cor do controle em vez de pintar de placeholder", () => {
    renderComProviders(
      <MultiSelect
        variante="chip"
        opcoes={OPCOES}
        selecionados={[]}
        onMudar={vi.fn()}
        placeholder="Todas as fases"
      />,
    );
    expect(corDoRotulo("Todas as fases")).toBe("");
  });

  it("no formulário, segue pintando de placeholder", () => {
    // Controle do teste acima: sem escolha, campo de formulário mostra
    // placeholder, e placeholder tem cor própria como todo campo do sistema.
    renderComProviders(
      <MultiSelect
        opcoes={OPCOES}
        selecionados={[]}
        onMudar={vi.fn()}
        placeholder="Selecione os subgrupos"
      />,
    );
    expect(corDoRotulo("Selecione os subgrupos")).toBe("var(--chakra-colors-fg-subtle)");
  });
});
