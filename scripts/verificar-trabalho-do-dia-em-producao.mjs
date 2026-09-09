/** Kanban, Agenda, Atendimentos e Documentos contra a produção.
 *
 * 🔴 Existe pela Fase 4 do `PLANO_TRAVAS_E_TETOS.md`, a maior superfície de
 * tela do plano: 11 schemas ganharam a trava do corpo e cinco rotas ganharam
 * teto no `subgrupo_id`, `tarefa_id`, `coluna_id`, `atendimento_id` e
 * `documento_id`. Uma trava a mais só aparece como erro para quem está na
 * tela -- a suíte manda os corpos que ELA escreve.
 *
 * ⚠️ `/tarefas` NÃO existe como endereço: ela redireciona para a home, calada.
 * O Kanban é `/kanban` e a lista por data é `/agenda`.
 *
 * ⚠️ Não cria nada: abre um documento que já existe e salva com os MESMOS
 * valores. O escritório de produção tem dado de verdade.
 *
 *     node scripts/verificar-trabalho-do-dia-em-producao.mjs
 */
import { APP, abrirProducaoLogado } from "./sessaoDeProducao.mjs";

const falhas = [];
const conferir = (rotulo, ok, detalhe = "") => {
  console.log(`  ${ok ? "ok " : "🔴 "}${rotulo}${detalhe ? `  ${detalhe}` : ""}`);
  if (!ok) falhas.push(rotulo);
};

const respostas = [];
const { navegador, pagina } = await abrirProducaoLogado({
  aoCriarPagina: (p) =>
    p.on("response", (r) =>
      respostas.push({
        metodo: r.request().method(),
        rota: new URL(r.url()).pathname + new URL(r.url()).search,
        status: r.status(),
      })),
});

/** ⚠️ `desde` é PARÂMETRO, e não capturado aqui dentro: quem chama já
 *  esperou a página assentar, então a resposta procurada muitas vezes JÁ
 *  chegou. Recapturar o marcador na entrada faz a busca começar depois dela
 *  e o guarda acusar `undefined` numa tela que carregou bem. */
async function esperar(casa, desde = respostas.length) {
  for (let i = 0; i < 100; i++) {
    const achou = respostas.slice(desde).find(casa);
    if (achou) return achou;
    await pagina.waitForTimeout(200);
  }
  return null;
}

/** Nenhum 422 na tela inteira -- é o sinal de que uma trava nova mordeu quem
 *  está usando o sistema. */
const nenhum422 = (desde) =>
  respostas.slice(desde).filter((r) => r.status === 422);

try {
  for (const [rota, oQueEspera] of [
    ["/kanban", (x) => x.rota.includes("/quadro")],
    ["/agenda", (x) => x.rota.startsWith("/tarefas")],
    ["/atendimentos", (x) => x.rota.startsWith("/atendimentos")],
    ["/documentos", (x) => x.rota.startsWith("/documentos")],
  ]) {
    const desde = respostas.length;
    await pagina.goto(`${APP}${rota}`);
    await pagina.waitForLoadState("networkidle");
    const r = await esperar(oQueEspera, desde);
    conferir(`${rota} carrega`, r?.status === 200, `${r?.rota?.slice(0, 46)} -> ${r?.status}`);
    const ruins = nenhum422(desde);
    conferir(`${rota} sem nenhum 422`, ruins.length === 0,
             ruins.map((x) => x.rota).join(", ").slice(0, 60));
  }

  // ── Documentos: abrir um existente e salvar com os mesmos valores ──────
  await pagina.goto(`${APP}/documentos`);
  const linha = pagina.getByRole("row").nth(1);
  await linha.waitFor({ timeout: 20_000 });
  await linha.click();
  const salvar = pagina.getByRole("button", { name: /^salvar$/i });
  await salvar.waitFor({ timeout: 20_000 });
  await salvar.click();
  const r = await esperar((x) => x.metodo === "PATCH" && x.rota.includes("/documentos/"));
  conferir("salvar o documento responde 200, e não 422", r?.status === 200,
           `-> ${r?.status}`);
} finally {
  await navegador.close();
}

console.log(`\n${falhas.length} falha(s).`);
process.exit(falhas.length ? 1 : 0);
