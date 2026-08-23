import { chromium } from "playwright";
import { readFileSync } from "fs";

const DIR = "/private/tmp/claude-501/-Users-pedrohenriquesousaalmeida-Documents-Projects-PJE-Monitor-api/6e01ebda-61d3-4fb5-81ee-111e9bf4be72/scratchpad";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);

const nav = await chromium.launch({ channel: "chrome", headless: false, slowMo: 60 });
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();

const erros = [], websockets = [];
p.on("pageerror", (e) => erros.push("pageerror: " + e.message.slice(0, 160)));
p.on("console", (m) => m.type() === "error" && erros.push("console: " + m.text().slice(0, 160)));
p.on("websocket", (ws) => {
  const reg = { url: ws.url().replace(/token=[^&]+/, "token=***"), fechou: false, quadros: 0 };
  websockets.push(reg);
  ws.on("framereceived", () => reg.quadros++);
  ws.on("close", () => (reg.fechou = true));
});

await p.goto("https://argos-monitor.vercel.app/", { waitUntil: "networkidle" });
console.log("1. página abriu em:", new URL(p.url()).pathname);

await p.getByLabel(/E-mail/i).fill(env.PJE_TEST_EMAIL);
await p.locator("#senha").fill(env.PJE_TEST_SENHA);
await p.getByRole("button", { name: /Entrar/i }).click();
await p.waitForTimeout(6000);
console.log("2. depois do login:", new URL(p.url()).pathname);

console.log("\n3. WEBSOCKET:");
if (!websockets.length) console.log("   NENHUMA conexão aberta -- VITE_WS_URL provavelmente não chegou ao build");
websockets.forEach((w) => {
  console.log(`   ${w.url}`);
  console.log(`   fechou: ${w.fechou}   quadros recebidos: ${w.quadros}`);
});

const sino = p.getByRole("button", { name: "Notificações" });
console.log("\n4. SINO:", (await sino.count()) === 1 ? "presente" : "AUSENTE");
if (await sino.count()) {
  console.log("   aviso aceso:", await sino.evaluate((e) => e.children.length > 1));
  await sino.click();
  await p.waitForTimeout(1200);
  const d = p.getByRole("dialog");
  if (await d.count()) {
    const cs = await sino.boundingBox(), cp = await d.boundingBox();
    console.log("   painel abaixo do sino:", cp.y > cs.y + cs.height - 1);
    console.log("   conteúdo:", JSON.stringify((await d.innerText()).replace(/\n/g, " | ").slice(0, 120)));
  }
}
await p.screenshot({ path: `${DIR}/prod-sino.png` });
console.log("\n5. " + (erros.length ? "ERROS:\n   " + [...new Set(erros)].join("\n   ") : "sem erros no console"));
await nav.close();
