/** A validação da tela "Importar por OAB", em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-importar-por-oab.mjs
 *
 * 🔴 **Existe porque a régua da inscrição virou COMPARTILHADA.** Ela saiu de
 * `erroDaBusca` para `utils/oab` quando o perfil passou a cadastrar a própria
 * OAB -- e esta tela, que já estava em produção, passou a depender do código
 * refatorado. Teste unitário passou; a régua do projeto é que interface se
 * confere em Chrome, porque jsdom já deu falso "passou" aqui antes.
 *
 * ⚠️ Quem mexer em `utils/oab` roda os DOIS: este e
 * `verificar-oab-no-perfil.mjs`. A mesma função, dois usos que discordam de
 * propósito -- lá as duas partes vazias são válidas (é como se apaga), aqui
 * são erro (não há o que buscar). */
import { chromium } from "playwright";
const APP = "http://localhost:5174";
const nav = await chromium.launch({ channel: "chrome", headless: false });
const p = await (await nav.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const problemas = [];
p.on("pageerror", (e) => problemas.push("erro de página: " + e.message.slice(0, 120)));

await p.goto(APP);
await p.getByLabel(/e-?mail/i).fill("chefe@local.test");
await p.getByRole("textbox", { name: "Senha" }).fill("Senha!Local1");
await p.getByRole("button", { name: /entrar/i }).click();
await p.getByText("Resumo rápido").waitFor();
await p.goto(APP + "/processos");

const ok = [];
const conferir = (o, n, d = "") => { ok.push(o); console.log(`${o ? "  ok  " : "FALHA "} ${n}${d ? " -- " + d : ""}`); };

const botao = p.getByRole("button", { name: /Importar por OAB/i });
conferir(await botao.isVisible(), "o botão Importar por OAB aparece");
await botao.click();

const numero = p.getByRole("textbox", { name: /Número da OAB/ });
await numero.waitFor({ timeout: 5000 });
const buscar = p.getByRole("button", { name: "Buscar processos" });

// vazio
await buscar.click();
conferir(await p.getByText("Informe o número da OAB").isVisible(), "vazio: cobra o número");

// letras
await numero.fill("abc");
await buscar.click();
conferir(await p.getByText("O número da OAB tem só dígitos").isVisible(), "letras: cobra dígitos");

// número sem UF
await numero.fill("148502");
await buscar.click();
conferir(await p.getByText("Selecione a UF da OAB").isVisible(), "número sem UF: cobra a UF");

console.log("");
for (const x of problemas) console.log("FALHA  " + x);
console.log(`\n${ok.filter(Boolean).length}/${ok.length} ok, ${problemas.length} problema(s) de página`);
await nav.close();
process.exit(ok.filter((o) => !o).length + problemas.length ? 1 : 0);
