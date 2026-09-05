/** A régua da Fase 0 e da Fase 3 do `PLANO_ARQUIVOS_MENORES.md`: os números do
 * front, medidos sempre do mesmo jeito.
 *
 *   node scripts/medirArquivos.mjs [pasta]      # padrão: src
 *
 * Conta arquivos `.ts`/`.tsx` fora testes e `.d.ts`; linhas; linhas de prosa
 * (comentário de linha, de bloco e o entre chaves do JSX); arquivos por faixa
 * de tamanho; linhas de
 * CÓDIGO (sem prosa e sem vazias); data de diário (data sem "medi" na mesma
 * linha, na prosa); blocos de prosa e quantos têm mais de um 🔴; e quantos
 * arquivos têm docstring de módulo (JSDoc no topo ou colado no primeiro
 * export).
 *
 * ⚠️ Mede FORMA, não conteúdo: é o que permite comparar o antes e o depois de
 * uma fase com a mesma régua. Nenhum número aqui decide sozinho um corte.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DATA = /\b\d{2}\/\d{2}\/\d{4}\b|\b\d{2}\/\d{2}\b|\b\d{2}\/\d{4}\b/;

function arquivos(pasta) {
  const lista = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) { lista.push(...arquivos(caminho)); continue; }
    if (!/\.tsx?$/.test(nome) || nome.includes(".test.") || nome.endsWith(".d.ts")) continue;
    lista.push(caminho);
  }
  return lista;
}

export function medirArquivo(texto) {
  // ⚠️ Sem o "" que o `\n` final produz: senão todo arquivo ganha uma linha a
  // mais, e a soma sai 383 acima do `wc -l`.
  const linhas = texto.replace(/\n$/, "").split("\n");
  let emBloco = false, prosa = 0, codigo = 0, diario = 0;
  for (const linha of linhas) {
    const s = linha.trim();
    if (!s) continue;
    let ehProsa = false;
    if (emBloco) { ehProsa = true; if (s.includes("*/")) emBloco = false; }
    else if (s.startsWith("//")) ehProsa = true;
    else if (s.startsWith("/*") || s.startsWith("{/*")) { ehProsa = true; if (!s.includes("*/")) emBloco = true; }
    if (ehProsa) {
      prosa += 1;
      if (DATA.test(s) && !/\bmedi/i.test(s)) diario += 1;
    } else codigo += 1;
  }
  const blocos = [...(texto.match(/\/\*[\s\S]*?\*\//g) ?? [])];
  let corrida = [];
  for (const linha of [...linhas, ""]) {
    if (linha.trim().startsWith("//")) corrida.push(linha);
    else if (corrida.length) { blocos.push(corrida.join("\n")); corrida = []; }
  }
  const comDocstring = /^\s*\/\*\*/.test(texto) || /\*\/\s*\nexport (default function|function|const)/.test(texto);
  return {
    linhas: linhas.length, prosa, codigo, diario,
    blocos: blocos.length,
    blocosComMaisDeUmVermelho: blocos.filter((b) => (b.match(/🔴/g) ?? []).length > 1).length,
    comDocstring,
  };
}

export function medir(pasta) {
  const total = { arquivos: 0, linhas: 0, prosa: 0, codigo: 0, maisDe500: 0, de301a500: 0, codigoMaisDe250: 0,
    arquivosComDiario: 0, linhasDeDiario: 0, blocos: 0, blocosComMaisDeUmVermelho: 0, comDocstring: 0 };
  for (const caminho of arquivos(pasta)) {
    const m = medirArquivo(readFileSync(caminho, "utf8"));
    total.arquivos += 1; total.linhas += m.linhas; total.prosa += m.prosa; total.codigo += m.codigo;
    if (m.linhas > 500) total.maisDe500 += 1; else if (m.linhas > 300) total.de301a500 += 1;
    if (m.codigo > 250) total.codigoMaisDe250 += 1;
    if (m.diario) { total.arquivosComDiario += 1; total.linhasDeDiario += m.diario; }
    total.blocos += m.blocos; total.blocosComMaisDeUmVermelho += m.blocosComMaisDeUmVermelho;
    if (m.comDocstring) total.comDocstring += 1;
  }
  return total;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const t = medir(process.argv[2] ?? "src");
  console.log(`arquivos ${t.arquivos} | linhas ${t.linhas} | prosa ${t.prosa} (${Math.round(100 * t.prosa / t.linhas)}%) | código ${t.codigo}`);
  console.log(`> 500 linhas: ${t.maisDe500} | 301-500: ${t.de301a500} | > 250 de código: ${t.codigoMaisDe250}`);
  console.log(`diário: ${t.arquivosComDiario} arquivos, ${t.linhasDeDiario} linhas | blocos ${t.blocos}, com mais de um 🔴: ${t.blocosComMaisDeUmVermelho}`);
  console.log(`com docstring de módulo: ${t.comDocstring} de ${t.arquivos}`);
}
