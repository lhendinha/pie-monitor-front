/** As telas de Grupo e Membros salvando de verdade, contra a produção.
 *
 * 🔴 Existe pela Fase 2 do `PLANO_TRAVAS_E_TETOS.md`: a API passou a RECUSAR
 * campo desconhecido no corpo de 9 schemas do cadastro do grupo, e a ganhar
 * teto de tamanho em `subgrupo_id` e `email`. Uma trava a mais só aparece
 * como erro para quem está na tela -- a suíte manda os corpos que ELA
 * escreve, e um 422 é resposta normal, sem log de exceção.
 *
 * ⚠️ Não cria nada e não muda nada: salva os MESMOS valores que já estão lá.
 * O escritório de produção tem dado de verdade -- criar um subgrupo de
 * mentira aqui o deixaria no sistema de quem usa.
 *
 *     node scripts/verificar-cadastros-do-grupo-em-producao.mjs
 *
 * ➡️ O irmão da Fase 1 é `verificar-perfil-em-producao.mjs`.
 */
import { APP, abrirProducaoLogado } from "./sessaoDeProducao.mjs";

const falhas = [];
const conferir = (rotulo, ok, detalhe = "") => {
  console.log(`  ${ok ? "ok " : "🔴 "}${rotulo}${detalhe ? `  ${detalhe}` : ""}`);
  if (!ok) falhas.push(rotulo);
};

/** Os PATCH/POST que a tela dispara, com o status de cada um. */
const escritas = [];
const { navegador, pagina } = await abrirProducaoLogado({
  aoCriarPagina: (p) =>
    p.on("response", (r) => {
      const m = r.request().method();
      if (m === "PATCH" || m === "POST")
        escritas.push({ rota: new URL(r.url()).pathname, status: r.status() });
    }),
});

/** Espera a próxima escrita chegar -- e nunca um toast: o toast do save
 *  anterior continua na tela e volta na hora. */
async function esperarEscrita(quantas) {
  for (let i = 0; i < 100 && escritas.length === quantas; i++)
    await pagina.waitForTimeout(200);
  return escritas.length > quantas ? escritas.at(-1) : null;
}

try {
  /* ⚠️ `/grupo` abre na aba Subgrupos, e as outras seis NÃO têm endereço
     próprio: `/membros` ou `/configuracoes` redirecionam para a home, calados.
     Chegar nelas é clicando na aba, como quem usa o sistema. */
  await pagina.goto(`${APP}/grupo`);
  await pagina.getByRole("tab", { name: "Configurações" }).click();
  const nome = pagina.getByRole("textbox", { name: /nome do grupo/i });
  await nome.waitFor({ timeout: 20_000 });
  const atual = await nome.inputValue();
  conferir("a aba Configurações abre com o nome", Boolean(atual), `"${atual}"`);

  await nome.fill(`${atual} `);
  await nome.fill(atual);
  await nome.fill(`${atual}.`);
  const antes = escritas.length;
  await pagina.getByRole("button", { name: /^salvar/i }).first().click();
  let r = await esperarEscrita(antes);
  conferir("salvar as configurações responde 200, e não 422",
           r?.status === 200, `${r?.rota} -> ${r?.status}`);

  // devolve o nome como estava
  const antes2 = escritas.length;
  await nome.fill(atual);
  await pagina.getByRole("button", { name: /^salvar/i }).first().click();
  r = await esperarEscrita(antes2);
  conferir("e o nome volta ao que era", r?.status === 200,
           `${r?.rota} -> ${r?.status}`);

  await pagina.reload();
  await pagina.getByRole("tab", { name: "Configurações" }).click();
  const voltou = await pagina
    .waitForFunction(
      (e) => [...document.querySelectorAll("input")]
        .some((i) => i.value === e), atual, { timeout: 20_000 })
    .then(() => true).catch(() => false);
  conferir("o recarregamento confirma", voltou);

  // ── Membros: abrir a edição e salvar sem mudar nada ────────────────────
  await pagina.goto(`${APP}/grupo`);
  await pagina.getByRole("tab", { name: "Membros" }).click();
  const editar = pagina.getByRole("button", { name: /editar/i }).first();
  await editar.waitFor({ timeout: 20_000 });
  await editar.click();
  const salvarMembro = pagina.getByRole("button", { name: /salvar/i }).last();
  await salvarMembro.waitFor({ timeout: 20_000 });
  const antes3 = escritas.length;
  await salvarMembro.click();
  r = await esperarEscrita(antes3);
  conferir("salvar o membro responde 200, e não 422",
           r?.status === 200, `${r?.rota} -> ${r?.status}`);
} finally {
  await navegador.close();
}

console.log(`\n${falhas.length} falha(s).`);
process.exit(falhas.length ? 1 : 0);
