/** O que o `setup.ts` remenda do jsdom, e o que ele deliberadamente NÃO
 * remenda.
 *
 * 🔴 Um remendo de ambiente é a coisa mais fácil de virar "ignore tudo": ele
 * mora longe do teste que ele salva, ninguém o revisa, e no dia em que
 * esconder um erro de verdade não haverá sinal nenhum. Estes testes existem
 * para que o alcance dele seja EXPLÍCITO, e não uma consequência.
 */
import { describe, expect, test, vi } from "vitest";

import { ERRO_DE_CSS_DO_JSDOM } from "./setup";

describe("PointerEvent", () => {
  test("existe, e é um evento de verdade", () => {
    const evento = new PointerEvent("pointerdown", {
      bubbles: true, clientX: 12, pointerId: 3, pointerType: "mouse",
    });
    expect(evento).toBeInstanceOf(MouseEvent);
    expect(evento.type).toBe("pointerdown");
    expect(evento.clientX).toBe(12);
    expect(evento.pointerId).toBe(3);
    expect(evento.pointerType).toBe("mouse");
  });

  test("e chega a quem escuta -- o borbulhar não se perde no substituto", () => {
    const alvo = document.createElement("button");
    document.body.append(alvo);
    const ouvinte = vi.fn();
    document.body.addEventListener("pointerdown", ouvinte);
    alvo.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(ouvinte).toHaveBeenCalledOnce();
    alvo.remove();
  });
});

describe("o erro de CSS do jsdom", () => {
  /** O `<style>` com `@layer` é o que o Chakra v3 insere. */
  const inserirEstilo = (css: string) => {
    const estilo = document.createElement("style");
    document.head.append(estilo);
    estilo.textContent = css;
    estilo.remove();
  };

  const erros = () => {
    const capturados: unknown[] = [];
    const virtual = (globalThis.window as unknown as {
      _virtualConsole: { on: (e: string, f: (x: unknown) => void) => void;
                         off: (e: string, f: (x: unknown) => void) => void };
    })._virtualConsole;
    const ouvinte = (erro: unknown) => capturados.push(erro);
    virtual.on("jsdomError", ouvinte);
    return { capturados, parar: () => virtual.off("jsdomError", ouvinte) };
  };

  test("`@layer` não faz barulho -- é o que o setup silencia", () => {
    const { capturados, parar } = erros();
    inserirEstilo("@layer tokens{a{color:red}}");
    parar();
    expect(capturados).toEqual([]);
  });

  test("🔴 e QUALQUER outro jsdomError continua subindo", () => {
    const { capturados, parar } = erros();
    const virtual = (globalThis.window as unknown as {
      _virtualConsole: { emit: (e: string, x: unknown) => void };
    })._virtualConsole;
    virtual.emit("jsdomError", new Error("um erro que importa"));
    parar();
    expect(capturados).toHaveLength(1);
    expect((capturados[0] as Error).message).toBe("um erro que importa");
  });

  test("o filtro casa a mensagem INTEIRA, e não um pedaço dela", () => {
    const { capturados, parar } = erros();
    const virtual = (globalThis.window as unknown as {
      _virtualConsole: { emit: (e: string, x: unknown) => void };
    })._virtualConsole;
    virtual.emit("jsdomError", new Error(`${ERRO_DE_CSS_DO_JSDOM} em outro lugar`));
    parar();
    expect(capturados).toHaveLength(1);
  });
});
