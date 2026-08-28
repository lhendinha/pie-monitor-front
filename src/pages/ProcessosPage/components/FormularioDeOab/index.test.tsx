import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../../../test/queryTestUtils";
import FormularioDeOab from "./index";

/** O período da busca por OAB: escondido no caminho comum, e com saída.
 *
 * 🔴 O que estes testes protegem é a simetria abrir/fechar. Um período
 * preenchido atrás de um cartão fechado filtraria a busca sem nada na tela
 * dizendo isso -- e a pessoa concluiria que a OAB não tem os processos que
 * ela sabe que tem.
 */
function montar(props: Partial<Parameters<typeof FormularioDeOab>[0]> = {}) {
  return renderComProviders(
    <FormularioDeOab buscando={false} onBuscar={vi.fn()} onCancelar={vi.fn()} {...props} />,
  );
}

const abrir = () => screen.queryByRole("button", { name: "Buscar por período" });
const fechar = () => screen.queryByRole("button", { name: "Fechar o período" });

describe("a UF da OAB", () => {
  it("filtra por digitação -- são 27 opções", async () => {
    /* ⚠️ Sem busca, chegar em "SP" é rolar a lista inteira. `permitirBusca`
       põe o cursor no próprio controle (o `isSearchable` da lib). */
    const onBuscar = vi.fn();
    montar({ onBuscar });
    const usuario = userEvent.setup();

    await usuario.type(screen.getByRole("combobox", { name: /UF da OAB/ }), "sp");

    const opcoes = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opcoes).toEqual(["SP"]);
  });

  it("a digitação escolhe de verdade, e é o que vai na busca", async () => {
    /* 🔴 O par do teste acima: filtrar sem conseguir escolher seria pior que
       não filtrar. E o valor tem que chegar em `onBuscar` -- é ele que a
       API recebe. */
    const onBuscar = vi.fn();
    montar({ onBuscar });
    const usuario = userEvent.setup();

    await usuario.type(screen.getByLabelText(/Número da OAB/), "206876");
    await usuario.type(screen.getByRole("combobox", { name: /UF da OAB/ }), "sp");
    await usuario.keyboard("{Enter}");
    await usuario.click(screen.getByRole("button", { name: "Buscar processos" }));

    expect(onBuscar).toHaveBeenCalledWith("206876", "SP", { de: "", ate: "" });
  });
});

describe("o cartão de período", () => {
  it("começa fechado, com o link à mostra", () => {
    montar();

    expect(abrir()).toBeInTheDocument();
    expect(screen.queryByLabelText("De")).not.toBeInTheDocument();
    expect(fechar()).not.toBeInTheDocument();
  });

  it("ao abrir, o LINK some e o X aparece", async () => {
    /* ⚠️ O link e o cartão são o mesmo controle em dois estados. Os dois na
       tela ao mesmo tempo ofereceriam abrir o que já está aberto. */
    montar();
    await userEvent.setup().click(abrir()!);

    expect(abrir()).not.toBeInTheDocument();
    expect(fechar()).toBeInTheDocument();
    expect(screen.getByLabelText("De")).toBeInTheDocument();
  });

  it("o X fecha e devolve o link", async () => {
    montar();
    const usuario = userEvent.setup();
    await usuario.click(abrir()!);
    await usuario.click(fechar()!);

    expect(screen.queryByLabelText("De")).not.toBeInTheDocument();
    expect(abrir()).toBeInTheDocument();
  });

  it("🔴 fechar LIMPA as datas -- não só esconde", async () => {
    /* O par que importa: sem isto, um "de" preenchido continuaria indo na
       busca depois de a caixa sumir da tela. */
    const onBuscar = vi.fn();
    montar({ onBuscar });
    const usuario = userEvent.setup();

    await usuario.click(abrir()!);
    /* ⚠️ `SeletorData` é o `DatePicker` do Chakra: não se digita nele, se
       abre o calendário e se clica no dia. Digitar no gatilho não muda
       valor nenhum -- e um teste que "preenche" assim passaria com o
       `fecharPeriodo` vazio, sem provar nada. */
    await usuario.click(screen.getByText("Início"));
    await usuario.click(await screen.findByRole("button", { name: /15 de/i }));
    expect(screen.queryByText("Início")).not.toBeInTheDocument();

    await usuario.click(fechar()!);

    await usuario.type(screen.getByLabelText(/Número da OAB/), "206876");
    /* ⚠️ `react-select`, não `<select>`: abre pelo papel e escolhe clicando
       na opção. `selectOptions` erra com "Value not found in options". */
    await usuario.click(screen.getByRole("combobox", { name: /UF da OAB/ }));
    await usuario.click(await screen.findByText("MG"));
    await usuario.click(screen.getByRole("button", { name: "Buscar processos" }));

    expect(onBuscar).toHaveBeenCalledWith("206876", "MG", { de: "", ate: "" });
  });

  it("abre já aberto quando a busca anterior voltou vazia", () => {
    /* ⚠️ Sem X nenhum? Não: quem chegou aqui por um resultado vazio também
       pode desistir do período. */
    montar({ periodoAberto: true });

    expect(screen.getByLabelText("De")).toBeInTheDocument();
    expect(fechar()).toBeInTheDocument();
  });
});
