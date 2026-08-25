/** Mede o custo POR TECLA nas pílulas com busca, em Chrome de verdade.
 *
 *   node scripts/medir-digitacao.mjs          # 5.000 itens
 *   node scripts/medir-digitacao.mjs 20000
 *
 * 🔴 Existe porque o mesmo defeito voltou DUAS VEZES, e nas duas eu só
 * descobri medindo -- lendo o código ele não aparece. A causa é sempre a
 * mesma família: trabalho proporcional ao tamanho da lista acontecendo a
 * cada tecla. No protótipo foram três (renderizar todos os resultados,
 * reordenar 5.000 nomes com `localeCompare`, esvaziar a lista durante a
 * espera); no componente de verdade foi de novo a primeira, com o
 * react-select desenhando uma linha de DOM por opção.
 *
 * Números medidos aqui, com 5.000 itens por trás de cada lista:
 *
 *     pílula de cliente (servidor corta em 50)   22ms por tecla
 *     pílula de situação, SEM teto              170ms por tecla
 *     pílula de situação, COM teto de 50         22ms por tecla
 *
 * E 22ms continua com 20.000 -- o custo era o DOM, não o filtro.
 *
 * ⚠️ Mede até a PINTURA (duas `requestAnimationFrame`), não até o React
 * terminar: é o atraso que a pessoa sente. Precisa do dev na 5174.
 */
import { chromium } from "playwright";
import { fingirSessao, instalarStubs } from "./stubsDaApi.mjs";

const MUITOS = Number(process.argv[2] || 5000);

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 0 });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
await fingirSessao(contexto);
await instalarStubs(contexto);

/* Sobrepõe DEPOIS dos stubs: cliente devolve o teto de 50 que o servidor
   devolve de verdade; situação devolve MUITAS, pra estressar o filtro local
   que roda no navegador. */
// ⚠️ Casa pelo PATHNAME exato, não por glob: um glob de "clientes" pega
// junto o módulo `/src/services/api/clientes.ts`, e responder JSON no lugar
// do JS quebra a página inteira -- foi o que aconteceu na 1a tentativa.
await contexto.route((u) => new URL(u).pathname.endsWith("/clientes"), (rota) => {
  const busca = new URL(rota.request().url()).searchParams.get("busca") || "";
  const todos = Array.from({ length: MUITOS }, (_, i) => ({
    cliente_id: `cli-${i}`,
    nome: `Cliente ${String(i).padStart(4, "0")} Silveira`,
  }));
  const achados = busca ? todos.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase())) : todos;
  // O servidor corta em 50 (MAXIMO_DE_RESULTADOS_DE_BUSCA).
  return rota.fulfill({ json: { clientes: achados.slice(0, 50), total: achados.length } });
});
await contexto.route((u) => new URL(u).pathname.endsWith("/situacoes"), (rota) =>
  rota.fulfill({
    json: {
      opcoes: Array.from({ length: MUITOS }, (_, i) => ({
        opcao_id: `situacao-${i}`, tipo: "situacao",
        rotulo: `Aguardando providência ${String(i).padStart(4, "0")}`,
        ordem: i, ativo: true,
      })),
      total: MUITOS,
    },
  }),
);

const pagina = await contexto.newPage();
await pagina.goto("http://localhost:5174/processos", { waitUntil: "networkidle" });
await pagina.waitForTimeout(1500);

async function medir(rotuloDaPilula, placeholderDoCampo, texto) {
  await pagina.getByText(rotuloDaPilula, { exact: true }).first().click();
  await pagina.waitForTimeout(900);
  const campo = pagina.getByPlaceholder(placeholderDoCampo);
  await campo.click();

  const tempos = [];
  for (const letra of texto) {
    const t = await pagina.evaluate(
      ([sel, ch]) => new Promise((ok) => {
        const el = document.querySelector(sel);
        const inicio = performance.now();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, el.value + ch);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        // Duas rAF: a primeira fecha o render, a segunda só roda depois da
        // PINTURA -- é o atraso que a pessoa sente, não o do React.
        requestAnimationFrame(() => requestAnimationFrame(() => ok(performance.now() - inicio)));
      }),
      [`input[placeholder="${placeholderDoCampo}"]`, letra],
    );
    tempos.push(Math.round(t));
  }
  const pior = Math.max(...tempos);
  console.log(`  ${rotuloDaPilula}: ${tempos.join("ms ")}ms  | pior ${pior}ms  | média ${Math.round(tempos.reduce((a, b) => a + b) / tempos.length)}ms`);
  await pagina.keyboard.press("Escape");
  await pagina.waitForTimeout(400);
  return pior;
}

console.log(`\nCom ${MUITOS} itens por trás de cada lista:\n`);
const piorCliente = await medir("Todos os clientes", "Buscar cliente", "silveira");
const piorSituacao = await medir("Todas as situações", "Buscar situação", "providencia");

console.log(`\n  16ms = um quadro a 60fps. Acima de ~50ms a tecla "gruda".`);
console.log(`  veredito: ${Math.max(piorCliente, piorSituacao) <= 50 ? "SEM delay perceptível" : "TEM delay"}\n`);

await pagina.waitForTimeout(1500);
await navegador.close();
