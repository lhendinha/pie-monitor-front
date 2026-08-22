/** Verifica uma tela do Argos num Chrome DE VERDADE, com janela.
 *
 *   node scripts/verificar-tela.mjs /processos
 *   node scripts/verificar-tela.mjs /processos --headless   (só pra CI)
 *
 * ⚠️ Com janela por padrão, e isso não é preferência: headless e jsdom já
 * deram "passou" em bug real. O caso que fechou a questão foi o campo de
 * data que não alternava -- clicar nele fechava e reabria o calendário.
 * jsdom não tem layout nem pintura, headless não reproduziu, e só apareceu
 * em Chrome com janela.
 *
 * A API é stubada (`stubsDaApi.mjs`), então não precisa de token nem de
 * backend no ar, e o dado é sempre o mesmo -- que é o que uma verificação
 * repetível exige.
 */
import { chromium } from "playwright";

import { fingirSessao, instalarStubs } from "./stubsDaApi.mjs";

const caminho = process.argv[2] || "/processos";
const headless = process.argv.includes("--headless");

const navegador = await chromium.launch({ channel: "chrome", headless, slowMo: headless ? 0 : 80 });
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
await fingirSessao(contexto);
await instalarStubs(contexto);

export const pagina = await contexto.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(`pageerror: ${e.message.slice(0, 160)}`));
pagina.on("console", (m) => m.type() === "error" && erros.push(`console: ${m.text().slice(0, 160)}`));

await pagina.goto(`http://localhost:5173${caminho}`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(1000);

console.log(`  ${caminho} aberto em Chrome ${headless ? "headless" : "com janela"}`);
if (erros.length) {
  console.log("  erros no console:");
  for (const e of [...new Set(erros)].slice(0, 6)) console.log(`    ${e}`);
} else {
  console.log("  sem erros no console");
}

/** Amostra o estado da tela a cada 15ms e devolve a linha do tempo
 * comprimida ("Ax47 |clique| fx12 Ax80").
 *
 * É o que distingue "não fechou" de "fechou e reabriu" -- os dois parecem
 * iguais numa verificação que só olha o estado final, e foi exatamente essa
 * diferença que escondeu o bug do calendário por várias rodadas. */
export async function gravarLinhaDoTempo(pagina, medir) {
  await pagina.evaluate((fonte) => {
    window.__medir = new Function(`return (${fonte})()`);
    window.__linha = [];
    window.__timer = setInterval(() => window.__linha.push(window.__medir()), 15);
  }, medir.toString());
  return {
    marcar: (texto) => pagina.evaluate((t) => window.__linha.push(`|${t}|`), texto),
    parar: async () => {
      const bruta = await pagina.evaluate(() => {
        clearInterval(window.__timer);
        return window.__linha;
      });
      const grupos = [];
      for (const x of bruta) {
        const ultimo = grupos.at(-1);
        if (ultimo && ultimo[0] === x) ultimo[1] += 1;
        else grupos.push([x, 1]);
      }
      return grupos.map(([x, n]) => (x.startsWith("|") ? x : `${x}x${n}`)).join(" ");
    },
  };
}

await pagina.waitForTimeout(headless ? 0 : 2500);
await navegador.close();
