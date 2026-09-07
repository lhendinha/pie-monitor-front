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
