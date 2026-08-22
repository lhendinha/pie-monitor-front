/** Tira screenshot de uma tela do Argos já autenticada.
 *
 * Serve pra validar visualmente cada componente durante a migração pro
 * Chakra, em vez de deduzir o resultado pelo CSS -- foi assim que o chip do
 * usuário passou com "layout todo errado" sem ninguém perceber.
 *
 *   node screenshot.mjs /processos processos.png
 *   node screenshot.mjs / raiz.png 1280x900
 *
 * O token é injetado no localStorage antes do app montar (`addInitScript`),
 * senão o app redireciona pro login antes de renderizar qualquer coisa.
 */
import { chromium } from "playwright";

const [, , caminho = "/", saida = "tela.png", tamanho = "1440x900"] = process.argv;
/** `VIEWPORT=1` tira só a dobra visível. Importante: com `fullPage` a
 * página estica e elementos `100vh` (o menu lateral) parecem cortados --
 * artefato do screenshot, não bug da tela. */
const soViewport = process.env.VIEWPORT === "1";
const [largura, altura] = tamanho.split("x").map(Number);

const BASE = "http://localhost:5173";
const TOKEN = process.env.TOKEN_DEMO;
if (!TOKEN) {
  console.error("defina TOKEN_DEMO (JWT de acesso) antes de rodar");
  process.exit(1);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: largura, height: altura },
  deviceScaleFactor: 2, // 2x pra dar pra ler texto pequeno no screenshot
});

await contexto.addInitScript(
  ([token, email, apelido, papel, grupoId]) => {
    localStorage.setItem("pje-monitor-access-token", token);
    // `estaAutenticado()` exige os DOIS -- só o access não basta.
    localStorage.setItem("pje-monitor-refresh-token", "demo-refresh");
    localStorage.setItem("pje-monitor-expira-em", String(Date.now() + 3600_000));
    localStorage.setItem("pje-monitor-email", email);
    localStorage.setItem("pje-monitor-apelido", apelido);
    localStorage.setItem("pje-monitor-papel", papel);
    localStorage.setItem("pje-monitor-grupo-id", grupoId);
  },
  [TOKEN, "ana@argos.local", "Ana Paula", "admin", process.env.GRUPO_DEMO || ""],
);

const pagina = await contexto.newPage();
const erros = [];
pagina.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 160)));
pagina.on("pageerror", (e) => erros.push(`pageerror: ${e.message.slice(0, 160)}`));

await pagina.goto(`${BASE}${caminho}`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(700); // deixa as queries assentarem
await pagina.screenshot({ path: saida, fullPage: !soViewport });

console.log(`  ${caminho} -> ${saida}`);
if (erros.length) {
  console.log("  erros no console:");
  for (const e of [...new Set(erros)].slice(0, 6)) console.log(`    ${e}`);
}

await navegador.close();
