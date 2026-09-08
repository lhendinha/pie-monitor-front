/** A tela de Perfil salvando de verdade, contra a produção, em Chrome.
 *
 * 🔴 Existe porque a Fase 1 do `PLANO_TRAVAS_E_TETOS.md` fez a API RECUSAR
 * campo desconhecido no corpo do `PATCH /me` e do `POST /senha/alterar`. Uma
 * trava a mais só aparece como erro para quem está usando o sistema: a suíte
 * manda os corpos que ELA escreve, e um 422 é resposta normal, não incidente
 * em log. Só a tela prova que o corpo que o front monta continua passando.
 *
 * ⚠️ Salva o MESMO nome que já está lá -- o roteiro não deixa resto. E não
 * troca a senha: o par negativo de `/senha/alterar` mudaria a credencial de
 * teste, então ele fica no `conferir_trava_do_corpo.py`, contra o offline.
 *
 *     node scripts/verificar-perfil-em-producao.mjs
 *
 * ➡️ `scripts/sessaoDeProducao.mjs` -- a sessão guardada custa ZERO tentativa.
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
    p.on("response", (r) => {
      if (new URL(r.url()).pathname === "/me" && r.request().method() === "PATCH")
        respostas.push(r.status());
    }),
});

try {
  await pagina.goto(`${APP}/perfil`);
  const campo = pagina.getByRole("textbox", { name: "Nome completo" });
  await campo.waitFor({ timeout: 20_000 });
  const nome = await campo.inputValue();
  conferir("a tela abre com o nome carregado", Boolean(nome), `"${nome}"`);

  const salvar = pagina.getByRole("button", { name: /salvar/i });

  /* 🔴 Espera o PATCH, e nunca o toast. O toast do save anterior continua na
     tela, então `waitFor` nele volta na hora e o roteiro segue achando que
     salvou -- foi assim que a primeira redação (08/09/2026) deixou o nome com
     um ponto a mais em produção e ainda imprimiu "ok". */
  async function salvarEsperando(valor) {
    const quantos = respostas.length;
    await campo.fill(valor);
    await salvar.click();
    for (let i = 0; i < 100 && respostas.length === quantos; i++)
      await pagina.waitForTimeout(200);
    return respostas.length > quantos ? respostas.at(-1) : 0;
  }

  conferir("salvar responde 200, e não 422",
           (await salvarEsperando(`${nome}.`)) === 200,
           `PATCH /me -> ${respostas.at(-1)}`);

  // Devolve o nome como estava. É o que faz o roteiro não deixar resto.
  conferir("o nome volta ao que era",
           (await salvarEsperando(nome)) === 200,
           `PATCH /me -> ${respostas.at(-1)}`);
  /* ⚠️ ESPERA o valor, e não o elemento. O campo nasce com o apelido que o
     contexto da sessão guarda e só depois o `GET /me` assenta: ler
     `inputValue` logo após o `waitFor` do elemento é uma checagem com prazo
     de validade, e ela acusou um falso 🔴 na primeira redação deste roteiro
     (08/09/2026), com o dado já certo no servidor.

     ⚠️ E é `.value` do elemento, não o atributo `value` do HTML: num input
     controlado pelo React o atributo não acompanha o que a pessoa vê. */
  await pagina.reload();
  const depois = pagina.getByRole("textbox", { name: "Nome completo" });
  await depois.waitFor({ timeout: 20_000 });
  const voltou = await pagina
    .waitForFunction(
      (esperado) =>
        document.getElementById("apelido-perfil")?.value === esperado,
      nome, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  conferir("e o recarregamento confirma", voltou,
           `"${await depois.inputValue()}"`);
} finally {
  await navegador.close();
}

console.log(`\n${falhas.length} falha(s).`);
process.exit(falhas.length ? 1 : 0);
