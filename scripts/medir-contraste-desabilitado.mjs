/** Mede o contraste REAL do campo desabilitado, e o compara com o Select
 * desabilitado que o projeto já usa.
 *
 * 🔴 O argumento de "desabilitado, não escondido" é que a pessoa PRECISA
 * ler o que está lá. Se o texto sai fraco demais, o argumento não se
 * sustenta -- e `getComputedStyle` sozinho não responde: a cor declarada é
 * escura, quem a apaga é a `opacity` do elemento.
 *
 * Por isso a medição é de PIXEL: recorta o campo e lê a cor do texto e a do
 * fundo direto da imagem.
 */
import { chromium } from "playwright";
import { PNG } from "pngjs";

const APP = "http://localhost:5174";

function luminancia([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const navegador = await chromium.launch({ channel: "chrome", headless: false });
const pagina = await (await navegador.newContext({ viewport: { width: 1500, height: 980 } })).newPage();

await pagina.goto(APP, { waitUntil: "networkidle" });
await pagina.evaluate(() => localStorage.clear());
await pagina.goto(APP, { waitUntil: "networkidle" });
await pagina.getByLabel(/e-mail/i).fill("user@local.test");
await pagina.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });

await pagina.goto(`${APP}/clientes`, { waitUntil: "networkidle" });
await pagina.locator("table tbody tr").first().click();
const campo = pagina.locator("#nome-cliente-edicao");
await campo.waitFor({ timeout: 15000 });

const png = PNG.sync.read(await campo.screenshot());
const cores = new Map();
for (let i = 0; i < png.data.length; i += 4) {
  const k = `${png.data[i]},${png.data[i + 1]},${png.data[i + 2]}`;
  cores.set(k, (cores.get(k) ?? 0) + 1);
}
const ordenadas = [...cores.entries()].sort((a, b) => b[1] - a[1]);
const fundo = ordenadas[0][0].split(",").map(Number);
/* 🔴 O texto ocupa POUCOS pixels num input -- um corte proporcional à área
   (0,2% era o primeiro palpite) descarta justamente o traço e devolve a
   borda do campo, dando um contraste de 1,1:1 que não existe.

   O corte é ABSOLUTO e baixo (>= 12 pixels), o suficiente para pular o
   antialias de uma letra só e ainda pegar o miolo do traço. */
const candidatas = ordenadas
  .filter(([, n]) => n >= 12)
  .map(([k, n]) => [k.split(",").map(Number), n]);
console.log("  cores mais escuras encontradas:");
for (const [c, n] of [...candidatas].sort((a, b) => luminancia(a[0]) - luminancia(b[0])).slice(0, 4)) {
  console.log(`    rgb(${c}) x${n}`);
}
const escura = [...candidatas].sort((a, b) => luminancia(a[0]) - luminancia(b[0]))[0][0];

const razao = contraste(escura, fundo);
console.log(`campo desabilitado (papel user)`);
console.log(`  fundo:  rgb(${fundo})`);
console.log(`  texto:  rgb(${escura})`);
console.log(`  contraste: ${razao.toFixed(2)}:1`);
console.log(`  AA para texto normal (4.5:1): ${razao >= 4.5 ? "✅ passa" : "❌ NÃO passa"}`);
console.log(`  AA para texto grande / UI (3:1): ${razao >= 3 ? "✅ passa" : "❌ NÃO passa"}`);

await navegador.close();
