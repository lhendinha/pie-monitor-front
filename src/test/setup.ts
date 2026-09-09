import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, vi } from "vitest";

// Sem `test.globals: true` no vite.config.ts (de propósito -- evita poluir
// o namespace global com describe/it/expect implícitos), o React Testing
// Library não detecta o afterEach do Vitest sozinho e não limpa o DOM
// entre testes -- sem isso, um render() de um teste vaza pro próximo.
afterEach(() => {
  cleanup();
});

/** O jsdom não implementa `ResizeObserver`, e os componentes do Chakra que
 * se posicionam sozinhos (Popover, DatePicker) instanciam um. Sem este
 * substituto o teste ainda passa, mas cospe `ResizeObserver is not defined`
 * no meio da saída -- e um erro de infraestrutura no log esconde o erro de
 * verdade quando algo quebra. */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** O jsdom não implementa `PointerEvent`, e o Chakra v3 o instancia ao dar
 * foco num botão (`@zag-js/focus-visible`). Sem este substituto o teste ainda
 * passa, mas `win.PointerEvent is not a constructor` sobe como erro NÃO
 * TRATADO -- e erro não tratado faz o `vitest` sair com código 1 mesmo com
 * 2.284 testes verdes, que é o pior sinal possível para um pipeline.
 *
 * ⚠️ Herda de `MouseEvent`, que o jsdom tem: é o que faz `clientX`,
 * `button` e o borbulhar continuarem funcionando de verdade.
 *
 * ➡️ Medido em 09/09/2026: 9 ocorrências na suíte, em 3 arquivos. */
if (!("PointerEvent" in globalThis)) {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(tipo: string, opcoes: PointerEventInit = {}) {
      super(tipo, opcoes);
      this.pointerId = opcoes.pointerId ?? 0;
      this.pointerType = opcoes.pointerType ?? "";
      this.isPrimary = opcoes.isPrimary ?? false;
    }
  } as unknown as typeof PointerEvent;
}

/** 🔴 O parser CSS do jsdom não entende `@layer`, e o Chakra v3 emite tudo
 * dentro de um. Cada `<style>` inserido vira um `jsdomError` -- e o vitest o
 * conta como erro NÃO TRATADO, então a suíte sai com código 1 sem nenhum
 * teste falhar.
 *
 * ⚠️ **E o custo não é só o código de saída.** Cada erro despeja o CSS
 * inteiro do Chakra no log: medido em 09/09/2026, 2.966 ocorrências e **49 MB**
 * de saída numa rodada. Um erro de verdade se perde ali dentro.
 *
 * 🔴 **Silencia SÓ este, pelo texto exato da mensagem.** Qualquer outro
 * `jsdomError` continua subindo -- é o que impede que este remendo vire um
 * "ignore tudo" no dia em que aparecer um erro que importa. Há teste
 * cobrando as duas metades: `src/test/setup.test.ts`.
 *
 * ⚠️ Medido: das construções modernas que o Chakra usa (`@media`,
 * `@supports`, `@container`, `@property`, `:where()`), o jsdom 25.0.1 só
 * falha em `@layer`. Não é o Chakra sendo exótico -- é o parser sendo
 * antigo, e o dia em que o jsdom o suportar este bloco pode sair inteiro. */
export const ERRO_DE_CSS_DO_JSDOM = "Could not parse CSS stylesheet";

const janela = globalThis.window as unknown as {
  _virtualConsole?: {
    emit: (evento: string, ...resto: unknown[]) => boolean;
  };
};
const consoleVirtual = janela?._virtualConsole;
if (consoleVirtual) {
  const emitirOriginal = consoleVirtual.emit.bind(consoleVirtual);
  consoleVirtual.emit = (evento: string, ...resto: unknown[]) => {
    const erro = resto[0] as { message?: string } | undefined;
    if (evento === "jsdomError" && erro?.message === ERRO_DE_CSS_DO_JSDOM) {
      return false;
    }
    return emitirOriginal(evento, ...resto);
  };
}


/** 🔴 Aninhamento de HTML inválido REPROVA o teste.
 *
 * O React avisa no console (`validateDOMNesting`) e segue em frente, então o
 * defeito passa despercebido em teste -- mas o NAVEGADOR não segue: ele fecha
 * a tag sozinho e o layout quebra. Foi como um `<div>` dentro de um `<p>`
 * chegou à tela do Financeiro, achado pelo usuário e não pelos 1.800 testes.
 *
 * ⚠️ Global, e não um teste só: o React avisa UMA VEZ por combinação de tags
 * em toda a execução, então um guarda local só funciona se for o primeiro a
 * renderizar aquele trecho -- ordem de teste não é lugar de apoiar garantia.
 *
 * ⚠️ `vi.spyOn`, e não trocar `console.error` na mão: o React guarda a
 * referência no carregamento do módulo, e a troca tardia não intercepta.
 */
let espiaDoConsole: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
  espiaDoConsole = vi.spyOn(console, "error");
});

afterEach(() => {
  const chamadas: unknown[][] = espiaDoConsole?.mock.calls ?? [];
  const aninhamento = chamadas
    .map((argumentos) => String(argumentos[0]))
    .filter((mensagem) => mensagem.includes("validateDOMNesting"));
  espiaDoConsole?.mockRestore();
  espiaDoConsole = null;
  expect(aninhamento, "aninhamento de HTML inválido -- o navegador fecha a tag e quebra o layout").toEqual([]);
});
