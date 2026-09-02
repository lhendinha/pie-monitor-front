import { screen } from "@testing-library/react";
import { memo, useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderComProviders } from "../../test/queryTestUtils";
import Modal from ".";

describe("pilha de modais", () => {
  /** 🔴 Com `[onFechar]` nas dependências, um callback com identidade nova
   * a cada render fazia o modal ABERTO sair e voltar pro TOPO da pilha --
   * invertendo a ordem. O diálogo de cima passaria a perder o Escape pro
   * formulário de baixo, que é o oposto do que a pilha existe pra garantir.
   *
   * Nenhum chamador dispara isso hoje porque o React Compiler memoiza os
   * callbacks -- mascaramento, não correção: basta um `onFechar` inline
   * sem memoização. */
  it("Escape fecha só o de CIMA, mesmo se o de baixo re-registrar", async () => {
    const user = userEvent.setup();
    const fecharDeBaixo = vi.fn();
    /* ⚠️ ESTÁVEL de propósito: só o de BAIXO pode re-registrar.
     *
     * A primeira versão deste teste re-renderizava os dois, e aí ambos
     * saíam e voltavam pra pilha -- a ordem relativa se preservava e a
     * mutação passava. A inversão exige que UM se reregistre sozinho. */
    const fecharDeCima = vi.fn();

    function DeCima() {
      return (
        <Modal titulo="De cima" onFechar={fecharDeCima} descarte="semFormulario">
          conteúdo
        </Modal>
      );
    }
    const DeCimaMemo = memo(DeCima);

    function Cena() {
      const [n, forcar] = useState(0);
      return (
        <>
          {/* `onFechar` com identidade nova a cada render: com deps em
              `[onFechar]`, este sai e volta pro TOPO da pilha. */}
          <Modal titulo="De baixo" onFechar={() => fecharDeBaixo(n)} descarte="semFormulario">
            <button onClick={() => forcar((x) => x + 1)}>re-render</button>
          </Modal>
          <DeCimaMemo />
        </>
      );
    }
    renderComProviders(<Cena />);

    await user.click(screen.getByRole("button", { name: "re-render" }));
    await user.keyboard("{Escape}");

    expect(fecharDeCima).toHaveBeenCalledTimes(1);
    expect(fecharDeBaixo).not.toHaveBeenCalled();
  });
});

describe("acaoNoCabecalho", () => {
  function montar(acao?: React.ReactNode) {
    return renderComProviders(
      <Modal titulo="Detalhes" onFechar={vi.fn()} acaoNoCabecalho={acao} descarte="semFormulario">
        <p>corpo</p>
      </Modal>,
    );
  }

  it("renderiza a ação no cabeçalho quando ela existe", () => {
    montar(<button type="button">Adicionar tarefa</button>);

    expect(screen.getByRole("button", { name: "Adicionar tarefa" })).toBeInTheDocument();
  });

  it("sem a prop, o cabeçalho fica só com o X -- nada muda pros outros 10 modais", () => {
    montar();

    const botoes = screen.getAllByRole("button");
    expect(botoes).toHaveLength(1);
    expect(botoes[0]).toHaveAccessibleName("Fechar");
  });

  it("🔴 o X é o ÚLTIMO na ordem do DOM", () => {
    /* Ele é o alvo que as pessoas procuram no canto: inverter a ordem faria
       alguém fechar o modal querendo clicar na ação. */
    montar(<button type="button">Adicionar tarefa</button>);

    const nomes = screen.getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(nomes).toEqual(["Adicionar tarefa", "Fechar"]);
  });

  it("🔴 a ação e o X ficam no MESMO grupo, à direita do título", () => {
    /* O `Flex` de fora é `space-between` com dois filhos (título e ações).
       Um terceiro filho direto jogaria a ação pro MEIO do cabeçalho, longe
       do X -- que é o oposto do que foi pedido. */
    montar(<button type="button">Adicionar tarefa</button>);

    const acao = screen.getByRole("button", { name: "Adicionar tarefa" });
    const fechar = screen.getByRole("button", { name: "Fechar" });
    expect(acao.parentElement).toBe(fechar.parentElement);

    const grupo = acao.parentElement!;
    const cabecalho = grupo.parentElement!;
    expect(cabecalho.children).toHaveLength(2);
    expect(cabecalho.lastElementChild).toBe(grupo);
  });
});

// ── 🔴 a guarda de descarte ───────────────────────────────────────────────

/** Um formulário de um campo só, para sujar DEPOIS da montagem.
 *
 * 🔴 Sujar depois é o ponto do arnês, e não detalhe de conveniência. Um teste
 * que renderizasse `descarte={{ mudou: true }}` já pronto passaria verde com a
 * implementação ERRADA -- aquela que captura o `mudou` da montagem no listener
 * de Escape. Na montagem ele é `false` por construção, então o defeito só
 * aparece quando o valor MUDA com o modal já aberto. */
function FormularioNoModal({ onFechar }: { onFechar: () => void }) {
  const [texto, setTexto] = useState("");
  return (
    <Modal titulo="Nova tarefa" onFechar={onFechar} descarte={{ mudou: texto !== "" }}>
      <label htmlFor="titulo">Título</label>
      <input id="titulo" value={texto} onChange={(e) => setTexto(e.target.value)} />
    </Modal>
  );
}

describe("guarda de descarte", () => {
  const cortina = () => document.querySelector('[role="dialog"]')!.parentElement!;
  const perguntou = () => screen.queryByText("Sair sem salvar?") !== null;

  async function montarSujo() {
    const usuario = userEvent.setup();
    const onFechar = vi.fn();
    renderComProviders(<FormularioNoModal onFechar={onFechar} />);
    await usuario.type(screen.getByLabelText("Título"), "a");
    return { usuario, onFechar };
  }

  it.each([
    ["Escape", async (u: ReturnType<typeof userEvent.setup>) => u.keyboard("{Escape}")],
    ["o X", async (u: ReturnType<typeof userEvent.setup>) =>
      u.click(screen.getByRole("button", { name: "Fechar" }))],
    ["o clique no fundo", async (u: ReturnType<typeof userEvent.setup>) => u.click(cortina())],
  ])("com o formulário mexido, %s PERGUNTA em vez de fechar", async (_nome, gesto) => {
    const { usuario, onFechar } = await montarSujo();

    await gesto(usuario);

    expect(perguntou()).toBe(true);
    expect(onFechar).not.toHaveBeenCalled();
  });

  it.each([
    ["Escape", async (u: ReturnType<typeof userEvent.setup>) => u.keyboard("{Escape}")],
    ["o X", async (u: ReturnType<typeof userEvent.setup>) =>
      u.click(screen.getByRole("button", { name: "Fechar" }))],
  ])("INTACTO, %s fecha direto, sem pergunta", async (_nome, gesto) => {
    /* O par negativo dos três acima: sem ele, "pergunta sempre" passaria. E é
       o caso mais comum de todos -- abrir sem querer e sair. */
    const usuario = userEvent.setup();
    const onFechar = vi.fn();
    renderComProviders(<FormularioNoModal onFechar={onFechar} />);

    await gesto(usuario);

    expect(perguntou()).toBe(false);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('"Sair sem salvar" fecha de verdade, uma vez só', async () => {
    const { usuario, onFechar } = await montarSujo();
    await usuario.keyboard("{Escape}");

    await usuario.click(screen.getByRole("button", { name: "Sair sem salvar" }));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  it('🔴 "Continuar editando" fecha SÓ a pergunta -- o texto continua lá', async () => {
    const { usuario, onFechar } = await montarSujo();
    await usuario.keyboard("{Escape}");

    await usuario.click(screen.getByRole("button", { name: "Continuar editando" }));

    expect(perguntou()).toBe(false);
    expect(onFechar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Título")).toHaveValue("a");
  });

  it("🔴 o Escape DENTRO da pergunta fecha só ela -- regressão da pilha", async () => {
    /* É para isto que a `pilhaDeModais` existe, e aqui ela é exercida pelo
       próprio `Modal`: o diálogo monta depois, fica no topo, e some sozinho. */
    const { usuario, onFechar } = await montarSujo();
    await usuario.keyboard("{Escape}");
    expect(perguntou()).toBe(true);

    await usuario.keyboard("{Escape}");

    expect(perguntou()).toBe(false);
    expect(onFechar).not.toHaveBeenCalled();
  });

  it('⚠️ o botão de desistir se chama "Continuar editando", não "Cancelar"', async () => {
    /* Dois botões com o mesmo nome acessível no mesmo documento quebram a
       busca por nome e fazem o leitor anunciar a escolha duas vezes. O
       formulário atrás continua montado, com o "Cancelar" dele. */
    const { usuario } = await montarSujo();

    await usuario.keyboard("{Escape}");

    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("⚠️ o formulário de trás fica `inert` enquanto a pergunta está aberta", async () => {
    /* Sem isso o Tab passeia pelos campos de trás (não há armadilha de foco
       em lugar nenhum) e o X de lá vira um segundo botão "Fechar". */
    const { usuario } = await montarSujo();
    expect(cortina()).not.toHaveAttribute("inert");

    await usuario.keyboard("{Escape}");

    expect(cortina()).toHaveAttribute("inert");
  });
});
