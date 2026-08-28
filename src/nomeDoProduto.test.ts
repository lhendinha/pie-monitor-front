import { describe, expect, it } from "vitest";

/** O produto se chama **Argos**, e o nome antigo não pode voltar pela aba.
 *
 * 🔴 O `<title>` ficou em "Diário — Monitor de Processos" por semanas depois
 * da renomeação, e ninguém viu: ele não aparece em tela nenhuma do sistema --
 * só na aba do navegador e no histórico, que é justamente onde ninguém olha
 * para conferir. Foi achado por acaso, lendo o HTML publicado.
 *
 * ⚠️ **`pje-monitor` continua legítimo em alguns lugares**, e este guarda NÃO
 * os cobra: a pilha da AWS (renomear recriaria os recursos) e o prefixo de
 * `localStorage` em `useUltimoSubgrupo` (renomear faria todo mundo perder o
 * último subgrupo escolhido). A régua é o que a PESSOA lê.
 */

const HTML = Object.values(
  import.meta.glob("/index.html", { query: "?raw", import: "default", eager: true }),
)[0] as string;

/** Nomes aposentados. Cada um esteve no `<title>` em algum momento. */
const APOSENTADOS = ["Diário", "Monitor de Processos", "PJe Monitor", "PJE Monitor"];

describe("o nome do produto na aba do navegador", () => {
  it("achou o index.html -- senão o guarda passaria vazio", () => {
    expect(HTML).toContain("<title>");
  });

  it("o título nomeia o Argos", () => {
    const titulo = HTML.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    expect(titulo).toContain("Argos");
  });

  it.each(APOSENTADOS)("não carrega o nome aposentado %s", (velho) => {
    const titulo = HTML.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    expect(titulo).not.toContain(velho);
  });
});
