/** A tela não afirma a OAB que ela não tem -- contra o BUNDLE PUBLICADO.
 *
 *   node scripts/verificar-oab-sem-dado-em-producao.mjs
 *
 * Irmão de `verificar-oab-sem-dado.mjs`, que roda contra o dev server. Este
 * existe porque os três estados corrigidos são TRANSITÓRIOS: em produção a
 * inscrição carrega em milissegundos e não falha sob demanda, então o
 * `verificar-deploy-em-producao.mjs` passaria sem nunca tocar no que mudou.
 * Aqui a rota é sequestrada no navegador, contra o que a Vercel publicou --
 * mede o que o build faz, não o que o dev server faz.
 *
 * 🔴 **NÃO GRAVA NADA, e isso é construído, não torcido.** O terceiro cenário
 * tenta submeter o formulário de propósito; se a trava tivesse falhado, um
 * PATCH real apagaria a inscrição de alguém de verdade. Por isso TODO PATCH
 * para `/grupos/membros/{email}` é respondido pelo próprio roteiro e nunca
 * chega ao servidor -- o roteiro detecta a tentativa sem executá-la.
 *
 * ⚠️ Sessão reaproveitada (`sessaoDeProducao.mjs`): zero tentativa de login
 * gasta enquanto o `.sessao-de-producao.json` valer.
 *
 * ⚠️ Um contexto só, com `reload()` entre os cenários: recarregar zera o
 * cache do React Query, que de outro modo serviria a resposta do cenário
 * anterior e o de erro nunca apareceria.
 */
import { abrirProducaoLogado, APP } from "./sessaoDeProducao.mjs";

/** O que a leitura da inscrição deve fazer AGORA. Trocado entre cenários. */
let comportamento = (rota) => rota.continue();
let patchesTentados = [];

const falhas = [];
const conferir = (ok, texto) => {
  console.log(`  ${ok ? "ok  " : "FALHA"}  ${texto}`);
  if (!ok) falhas.push(texto);
};

const { navegador, contexto, pagina } = await abrirProducaoLogado();

/* Um handler só para leitura e escrita do mesmo caminho: o PATCH tem de ser
   barrado com a mesma certeza com que o GET é sequestrado, e dois handlers
   no mesmo padrão só deixariam dúvida sobre qual atende. */
await contexto.route(
  (url) => /\/grupos\/membros\/[^/?]+$/.test(url.pathname),
  (rota) => {
    if (rota.request().method() === "PATCH") {
      patchesTentados.push(rota.request().postData());
      return rota.fulfill({ status: 200, json: {} }); // 🔴 morre aqui
    }
    return comportamento(rota);
  },
);

/** Abre o modal do primeiro membro editável da lista. */
async function abrirModal() {
  await pagina.goto(`${APP}/grupo`, { waitUntil: "networkidle" });
  await pagina.getByRole("tab", { name: "Membros" }).click();
  const editar = pagina.getByRole("button", { name: /^Editar / }).first();
  await editar.waitFor();
  await editar.click();
  await pagina.getByRole("dialog").waitFor();
}

const campoDaOab = () => pagina.getByLabel(/Número da OAB/);
const salvar = () => pagina.getByRole("button", { name: "Salvar" });

// ── 1. carregando: não há campo para a resposta sobrescrever ──────────────
console.log("\n1. enquanto a inscrição carrega");
let liberar;
const espera = new Promise((r) => { liberar = r; });
comportamento = async (rota) => { await espera; return rota.continue(); };
await abrirModal();

conferir(await campoDaOab().count() === 0, "o campo de OAB não existe na tela");
conferir(await pagina.getByText("Carregando…").count() > 0, "o esqueleto anuncia «Carregando…»");
conferir(await salvar().isDisabled(), "o Salvar está travado");

liberar();
await campoDaOab().waitFor();
conferir(await campoDaOab().isVisible(), "chegando a resposta, os campos aparecem");
conferir(await salvar().isEnabled(), "e o Salvar destrava");

// ── 2. erro: a tela diz que não sabe, e não deixa salvar por cima ─────────
console.log("\n2. quando a leitura da inscrição FALHA");
comportamento = (rota) => rota.abort("failed");
await abrirModal();

/* ⚠️ Escopado ao diálogo: `useToastOnQueryError` mostra a mesma frase no
   toast. E o timeout é FOLGADO de propósito -- o `queryClient` repete erro
   transitório 3 vezes, e o erro só aparece depois de ~7s. */
await pagina.getByRole("dialog").getByText(/Não foi possível carregar a inscrição/)
  .waitFor({ timeout: 30_000 });
conferir(await campoDaOab().count() === 0, "o campo de OAB não existe na tela");
conferir(await pagina.getByRole("button", { name: "Tentar de novo" }).count() > 0,
  "oferece «Tentar de novo» em vez de virar beco");
conferir(await salvar().isDisabled(), "o Salvar está travado");

const nome = pagina.getByLabel(/Nome completo/);
await nome.fill("Verificação Automática");
conferir(await nome.inputValue() === "Verificação Automática", "o Nome completo continua editável");
conferir(await salvar().isDisabled(), "e mesmo editado, o Salvar segue travado");

// ── 3. 🔴 o Enter, que é o caminho que o jsdom não tem ────────────────────
console.log("\n3. o Enter num campo de texto, com a leitura falhando");
patchesTentados = [];
await nome.press("Enter");
await pagina.waitForTimeout(1500);

conferir(
  patchesTentados.length === 0,
  `o Enter não disparou PATCH nenhum${patchesTentados.length ? ` -- tentou ${patchesTentados[0]}` : ""}`,
);
conferir(await pagina.getByRole("dialog").count() > 0, "e o modal continua aberto");

await navegador.close();
console.log(
  `\n${falhas.length ? `${falhas.length} FALHA(S)` : "tudo certo"} -- ` +
    `nenhuma escrita chegou ao servidor (${patchesTentados.length} PATCH barrado no navegador)\n`,
);
process.exit(falhas.length ? 1 : 0);
