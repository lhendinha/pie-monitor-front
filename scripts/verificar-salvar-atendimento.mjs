/** O PATCH da aba Detalhes leva só o que MUDOU, em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *   2) .venv/bin/python scripts/offline/semear_status_desconhecido.py
 *   3) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174 --strictPort
 *   4) node scripts/verificar-salvar-atendimento.mjs
 *
 * 🔴 Por que Chrome e não jsdom: o que se prova aqui é o CORPO que sai na
 * rede e a RESPOSTA que volta. O teste de unidade afirma o corpo contra um
 * mock -- se a API mudasse de opinião sobre ele, o mock continuaria feliz.
 *
 * 🔴 O caso central é o atendimento com status FORA do vocabulário, que a
 * API não deixa criar (por isso a semente grava direto na tabela). Antes de
 * 07/09/2026, editar só o assunto dele devolvia 400 "Status inválido" e a
 * edição inteira se perdia.
 *
 * ⚠️ `APP_URL` existe porque a 5174 pode estar ocupada por um dev de outra
 * árvore -- e conferir a tela errada é pior que não conferir.
 */
import { chromium } from "playwright";

const APP = process.env.APP_URL ?? "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };
const SUBGRUPO = "0e5ed71c5b17";
const COM_STATUS_DE_FORA = "at-status-desconhecido";

let ok = 0;
let ruim = 0;
function dizer(passou, o_que, detalhe = "") {
  console.log(`  ${passou ? "OK  " : "RUIM"}  ${o_que}${detalhe ? ` -- ${detalhe}` : ""}`);
  passou ? ok++ : ruim++;
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
const pagina = await contexto.newPage();

/** Os PATCH de atendimento que passaram pela rede, com corpo e resposta. */
const patches = [];
pagina.on("request", (r) => {
  if (r.method() === "PATCH" && r.url().includes("/atendimentos/")) {
    patches.push({ corpo: JSON.parse(r.postData() ?? "{}"), status: null });
  }
});
pagina.on("response", async (r) => {
  if (r.request().method() === "PATCH" && r.url().includes("/atendimentos/")) {
    const alvo = patches[patches.length - 1];
    if (alvo) alvo.status = r.status();
  }
});

try {
  await pagina.goto(APP, { waitUntil: "networkidle" });
  await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
  // ⚠️ Por ROLE: `getByLabel(/senha/i)` casa também com "Mostrar senha".
  await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
  await pagina.getByRole("button", { name: /entrar/i }).click();
  await pagina.waitForURL((u) => !u.pathname.includes("login"), { timeout: 20000 });

  await pagina.goto(`${APP}/atendimentos/${SUBGRUPO}/${COM_STATUS_DE_FORA}`,
                    { waitUntil: "networkidle" });
  await pagina.getByRole("tab", { name: "Detalhes" }).click();

  console.log("\n— o atendimento com status FORA do vocabulário —");
  const etiqueta = await pagina.getByText("Arquivado", { exact: true }).first().isVisible()
    .catch(() => false);
  dizer(etiqueta, "a tela MOSTRA o status desconhecido, não o esconde");

  const campoAssunto = pagina.getByLabel(/Assunto/);
  await campoAssunto.fill("Assunto corrigido pela conferência");
  await pagina.getByRole("button", { name: "Salvar" }).click();
  await pagina.waitForTimeout(2500);

  const primeiro = patches[0];
  dizer(!!primeiro, "o PATCH saiu", primeiro ? JSON.stringify(primeiro.corpo) : "nenhum");
  if (primeiro) {
    dizer(primeiro.status === 200, "🔴 o servidor ACEITOU -- era 400 'Status inválido'",
          `HTTP ${primeiro.status}`);
    dizer(!("status" in primeiro.corpo), "🔴 o corpo NÃO leva o status desconhecido",
          Object.keys(primeiro.corpo).join(", ") || "vazio");
    dizer(primeiro.corpo.assunto === "Assunto corrigido pela conferência",
          "o corpo leva o assunto novo");
    dizer(!("responsaveis" in primeiro.corpo), "e não leva os responsáveis intocados");
  }

  console.log("\n— e escolher um status válido volta a andar —");
  await pagina.reload({ waitUntil: "networkidle" });
  await pagina.getByRole("tab", { name: "Detalhes" }).click();
  await pagina.getByLabel("Status").click();
  await pagina.getByRole("option", { name: "Fechado" }).click();
  await pagina.getByRole("button", { name: "Salvar" }).click();
  await pagina.waitForTimeout(2500);

  const segundo = patches[1];
  dizer(!!segundo && segundo.status === 200, "o PATCH do status passou",
        segundo ? `HTTP ${segundo.status}` : "nenhum");
  if (segundo) {
    dizer(Object.keys(segundo.corpo).join() === "status",
          "e leva SÓ o status", JSON.stringify(segundo.corpo));
  }
} finally {
  console.log(`\n${ok}/${ok + ruim} conferências passaram`);
  await navegador.close();
}
process.exit(ruim ? 1 : 0);
