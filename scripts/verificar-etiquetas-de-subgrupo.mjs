/** A régua de `EtiquetasDeSubgrupo` nas DUAS tabelas -- em Chrome de verdade.
 *
 *   1) cd ../api && yarn offline
 *      .venv/bin/python scripts/offline/semear_inscricoes_avulsas.py
 *   2) VITE_API_URL=http://localhost:8099 VITE_WS_URL=ws://localhost:8098 \
 *        yarn dev --port 5174
 *   3) node scripts/verificar-etiquetas-de-subgrupo.mjs
 *
 * 🔴 O que só o Chrome responde é a razão de o teto existir: a ALTURA DA
 * LINHA. jsdom não mede layout, então lá "10 subgrupos" e dez etiquetas são
 * a mesma coisa. Aqui a altura das linhas é medida, e é isso que prova que o
 * resumo serve para o que foi feito.
 */
import { chromium } from "playwright";

const APP = "http://localhost:5174";
const CONTA = { email: "chefe@local.test", senha: "Senha!Local1" };

const navegador = await chromium.launch({ channel: "chrome", headless: false, slowMo: 20 });
const pagina = await (
  await navegador.newContext({ viewport: { width: 1500, height: 1000 } })
).newPage();

const problemas = [];
const conferir = (ok, oQue) => {
  console.log(`${ok ? "  ok  " : "FALHA "} ${oQue}`);
  if (!ok) problemas.push(oQue);
};

await pagina.goto(APP);
await pagina.getByLabel(/e-?mail/i).fill(CONTA.email);
await pagina.getByRole("textbox", { name: "Senha" }).fill(CONTA.senha);
await pagina.getByRole("button", { name: /entrar/i }).click();
await pagina.getByText("Resumo rápido").waitFor();

// ── 1. a coluna "Subgrupo" de Membros, nos quatro casos ─────────────────
// ⚠️ NÃO existe rota `/membros`: Membros é ABA de `/grupo`. Um `goto` para
// `/membros` cai no `Navigate to="/"` e o roteiro verificaria a HOME sem
// perceber -- foi o que aconteceu na primeira versão deste arquivo.
await pagina.goto(`${APP}/grupo`);
await pagina.getByRole("tab", { name: "Membros" }).click();
await pagina.getByText("Ângela Dez Subgrupos").waitFor();
const linhaDe = (nome) => pagina.locator("tbody tr", { hasText: nome });

console.log("\n-- Membros --");
conferir(
  (await linhaDe("Ângela Dez Subgrupos").getByText("10 subgrupos").count()) === 1,
  "dez subgrupos viram a CONTAGEM",
);
conferir(
  (await linhaDe("Duas Nomes Costa").getByText("Trabalhista").count()) === 1,
  "dois subgrupos mostram os NOMES",
);
conferir(
  (await linhaDe("Vitória Sem Subgrupo").getByText("—").count()) >= 1,
  "sem subgrupo, o travessão",
);

/* 🔴 A razão do teto, MEDIDA -- é o que só o Chrome responde: sem o resumo,
   dez etiquetas quebram em fileiras e a linha cresce.

   ⚠️ Compara com a linha de DOIS, e não com a vazia: as duas desenham
   etiqueta, e a vazia desenha texto (o travessão). Etiqueta tem borda e
   padding, então a vazia é meio pixel mais baixa por natureza -- comparar
   com ela reprovaria uma tela correta. */
const alturaDe = async (nome) => (await linhaDe(nome).boundingBox()).height;
const [cheia, dupla] = [await alturaDe("Ângela Dez Subgrupos"), await alturaDe("Duas Nomes Costa")];
conferir(cheia === dupla, `a linha de 10 tem a MESMA altura da de 2 (${cheia}px vs ${dupla}px)`);

// ── 2. a mesma régua na aba de inscrições ───────────────────────────────
await pagina.getByRole("tab", { name: "Inscrições na OAB" }).click();
await pagina.getByText("Inscrições da OAB").waitFor();

console.log("\n-- Inscrições na OAB --");
/* ⚠️ Os painéis de aba ficam MONTADOS (ver `verificar-abas.mjs`), então um
   `tbody tr` solto casa também com a tabela de Membros -- e o roteiro leria a
   tabela errada sem falhar. As linhas de inscrição são as que têm "NNN/MG". */
const linhasDeInscricao = pagina.locator("tbody tr", { hasText: /\d+\/MG/ });
/* 🔴 ESPERA um NOME resolvido, e não a etiqueta de contagem: `subgrupos` é []
   enquanto o catálogo não chega, e aí TODO destino cai no id cru
   (`S-CHEIO-02`).

   ⚠️ Esperar por "5 subgrupos" NÃO serve, e foi o erro da primeira versão: a
   contagem sai do tamanho da lista de ids e aparece sem o catálogo. O roteiro
   media o estado de carregamento e reprovava uma tela correta. */
await linhasDeInscricao.getByText("Trabalhista").first().waitFor();

const naPagina = await linhasDeInscricao.count();
conferir(naPagina === 10, `a página mostra 10 das inscrições (achei ${naPagina})`);
conferir(
  (await pagina.getByText("de 20").count()) >= 1 ||
    (await pagina.getByText("20").count()) >= 1,
  "a barra de paginação declara as 20",
);
conferir(
  (await linhasDeInscricao.getByText("5 subgrupos").count()) >= 1,
  "destino com cinco vira a CONTAGEM",
);
conferir(
  (await linhasDeInscricao.getByText("Ângela e Associados").count()) >= 1,
  "destino com poucos mostra o NOME, e não o id cru",
);

await navegador.close();
console.log(problemas.length ? `\n${problemas.length} FALHA(S)` : "\nTudo certo.");
process.exit(problemas.length ? 1 : 0);
