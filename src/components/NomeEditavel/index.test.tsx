import { screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import NomeEditavel from ".";

function montar(extra: Partial<Parameters<typeof NomeEditavel>[0]> = {}) {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();
  renderComProviders(
    <NomeEditavel
      nome="Cível"
      editando
      podeRenomear
      onIniciar={vi.fn()}
      onConfirmar={onConfirmar}
      onCancelar={onCancelar}
      {...extra}
    />,
  );
  return { onConfirmar, onCancelar };
}

const campo = () => screen.getByRole("textbox");

describe("NomeEditavel — estado de salvando", () => {
  it("em repouso, o campo é editável", () => {
    montar();
    expect(campo()).not.toHaveAttribute("readonly");
  });

  it("salvando, o campo fica em leitura", async () => {
    // Sem isto, confirmar não mudava NADA na tela: o campo seguia editável,
    // com o texto novo, e a pessoa não sabia se o Enter tinha pegado.
    montar({ salvando: true });
    expect(campo()).toHaveAttribute("readonly");
  });

  it("salvando, sair do campo NÃO reenvia o rename", async () => {
    /* Controle da guarda dentro de `confirmar`.
     *
     * ⚠️ O texto precisa estar ALTERADO. Com o rascunho igual ao nome,
     * `confirmar()` cai no ramo do `onCancelar` e o teste passaria mesmo
     * sem a guarda -- foi o que aconteceu na primeira versão deste arquivo.
     *
     * O harness reproduz o fluxo real em vez de forçar a prop: confirmar É
     * o que inicia o salvamento, então `salvando` vira `true` com o texto
     * novo no campo, e o `onBlur` ainda pendurado tentaria mandar de novo. */
    const user = userEvent.setup();
    const onConfirmar = vi.fn();

    function Harness() {
      const [salvando, setSalvando] = useState(false);
      return (
        <NomeEditavel
          nome="Cível"
          editando
          podeRenomear
          onIniciar={vi.fn()}
          onCancelar={vi.fn()}
          salvando={salvando}
          onConfirmar={(nome) => {
            setSalvando(true);
            onConfirmar(nome);
          }}
        />
      );
    }

    renderComProviders(<Harness />);

    await user.clear(campo());
    await user.type(campo(), "Trabalhista{Enter}");
    expect(onConfirmar).toHaveBeenCalledTimes(1);

    await user.click(campo());
    await user.tab();

    // Continua UMA vez: o blur não somou uma segunda.
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it("sem salvar, Enter confirma normalmente", async () => {
    // Controle dos três acima: sem ele, eles passariam mesmo se o
    // componente tivesse parado de confirmar em qualquer situação.
    const user = userEvent.setup();
    const { onConfirmar } = montar();

    await user.clear(campo());
    await user.type(campo(), "Trabalhista{Enter}");

    expect(onConfirmar).toHaveBeenCalledWith("Trabalhista");
  });

  it("Escape desiste mesmo salvando -- é a saída de quem desistiu", async () => {
    const user = userEvent.setup();
    const { onCancelar } = montar({ salvando: true });

    await user.click(campo());
    await user.keyboard("{Escape}");

    expect(onCancelar).toHaveBeenCalled();
  });
});

/** O componente é renderizado sempre -- editando ou não --, então a
 * instância sobrevive entre edições. É isso que fazia o rascunho velho
 * voltar. Este wrapper reproduz o uso real (`LinhaDeOpcao`,
 * `ListaDeSubgrupos`, `LinhaDeColuna`). */
function Cenario({ onConfirmar }: { onConfirmar: (nome: string) => void }) {
  const [editando, setEditando] = useState(false);
  return (
    <NomeEditavel
      nome="Cível"
      podeRenomear
      editando={editando}
      onIniciar={() => setEditando(true)}
      onConfirmar={(n) => {
        setEditando(false);
        onConfirmar(n);
      }}
      onCancelar={() => setEditando(false)}
    />
  );
}

describe("NomeEditavel", () => {
  it("🔴 texto cancelado com Escape NÃO volta na próxima edição", async () => {
    /* `useState(nome)` só vale na primeira montagem, e o Escape não
     * ressincronizava o rascunho. A pessoa digitava "Trabalhista" sobre
     * "Cível", apertava Escape (desistiu), clicava no nome de novo -- e o
     * campo reabria com "Trabalhista". Sair do campo sem tocar em nada
     * disparava o `onBlur` -> `confirmar()`, e o rename CANCELADO era
     * comitado. Valia para subgrupo, fase e coluna. */
    const onConfirmar = vi.fn();
    const user = userEvent.setup();
    renderComProviders(<Cenario onConfirmar={onConfirmar} />);

    await user.click(screen.getByText("Cível"));
    const campo = screen.getByRole("textbox");
    await user.clear(campo);
    await user.type(campo, "Trabalhista");
    await user.keyboard("{Escape}");

    // Reabre: o campo tem que trazer o nome REAL, não o rascunho abandonado.
    await user.click(screen.getByText("Cível"));
    expect(screen.getByRole("textbox")).toHaveValue("Cível");

    // E sair do campo não pode comitar nada.
    await user.tab();
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});

/** Monta com `falhou` controlado por quem CHAMA `onConfirmar` -- é assim que
 * a página real se comporta: o pedido sai, o servidor recusa, e só então
 * `falhou` vira true.
 *
 * ⚠️ Montar já com `falhou: true` não modela nada: o efeito que registra o
 * recusado dispara na TRANSIÇÃO, e a primeira versão deste teste passava
 * pelo motivo errado. */
function montarComFalhaNoEnvio() {
  const onConfirmar = vi.fn();
  const onCancelar = vi.fn();

  function Wrapper() {
    const [falhou, setFalhou] = useState(false);
    return (
      <NomeEditavel
        nome="Cível"
        editando
        podeRenomear
        falhou={falhou}
        onIniciar={vi.fn()}
        onConfirmar={(n) => {
          onConfirmar(n);
          setFalhou(true); // o servidor recusou
        }}
        onCancelar={onCancelar}
      />
    );
  }

  renderComProviders(<Wrapper />);
  return { onConfirmar, onCancelar };
}

describe("NomeEditavel — depois de um rename recusado", () => {
  /* 🔴 Estes dois testes cobrem os DOIS lados de uma correção minha que, na
   * primeira versão, consertou um lado e quebrou o outro.
   *
   * O problema original: rename recusado (409 de nome duplicado) deixava o
   * campo aberto -- de propósito, pra corrigir a digitação --, mas cada
   * clique fora disparava `onBlur` -> `confirmar()` -> o mesmo 409, em laço.
   *
   * A primeira correção guardava `rascunho.trim()` num efeito que dependia
   * de `rascunho`: enquanto `falhou` fosse true, cada TECLA regravava o
   * recusado, e `confirmar()` sempre caía no ramo de cancelar. Enter e
   * clique fora passaram a DESCARTAR o rename em silêncio, pra sempre. */

  it("sair do campo sem mudar o texto recusado não reenvia", async () => {
    const user = userEvent.setup();
    const { onConfirmar } = montarComFalhaNoEnvio();

    await user.clear(campo());
    await user.type(campo(), "Trabalhista");
    await user.tab();

    // Primeira tentativa sai; o `falhou` só passa a valer depois dela.
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    onConfirmar.mockClear();

    // Sair de novo, com o MESMO texto que já foi recusado: desiste.
    await user.click(campo());
    await user.tab();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("🔴 mas trocar o texto reenvia -- a correção não pode matar o rename", async () => {
    const user = userEvent.setup();
    const { onConfirmar } = montarComFalhaNoEnvio();

    await user.clear(campo());
    await user.type(campo(), "Trabalhista");
    await user.tab();
    onConfirmar.mockClear();

    await user.click(campo());
    await user.clear(campo());
    await user.type(campo(), "Previdenciário");
    await user.tab();

    expect(onConfirmar).toHaveBeenCalledWith("Previdenciário");
  });

  it("🔴 Enter reenvia o MESMO texto recusado -- só o blur desiste", async () => {
    /* `falhou` vem de `mutation.isError`, true pra QUALQUER falha -- não só
     * o 409 de nome duplicado pro qual a guarda foi escrita. Aplicá-la
     * também ao Enter fazia um blip de rede tornar o nome inalcançável pra
     * sempre: apertar Enter de novo com o mesmo texto não mandava pedido
     * nenhum e não dizia nada.
     *
     * Enter é gesto explícito -- quem aperta está pedindo de novo de
     * propósito. Sair do campo é que é ambíguo, e era de lá que vinha o
     * laço. */
    const user = userEvent.setup();
    const { onConfirmar } = montarComFalhaNoEnvio();

    await user.clear(campo());
    await user.type(campo(), "Trabalhista{Enter}");
    expect(onConfirmar).toHaveBeenCalledTimes(1);
    onConfirmar.mockClear();

    // Mesmo texto, de novo, por Enter: manda.
    await user.click(campo());
    await user.type(campo(), "{Enter}");
    expect(onConfirmar).toHaveBeenCalledWith("Trabalhista");
  });
});
