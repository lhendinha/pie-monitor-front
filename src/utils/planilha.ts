/** CSV gerado NO NAVEGADOR, e baixado sem passar pelo servidor.
 *
 * 🔴 No navegador porque o dado já está na tela: a tabela do fluxo veio de
 * uma resposta que a pessoa está olhando, e uma rota de exportação seria a
 * mesma leitura de novo (partição inteira do grupo, 259 RCU medidos) para
 * produzir os mesmos números.
 *
 * 🔴 **Separador `;` e BOM.** O Excel em português lê `,` como separador
 * DECIMAL, e um arquivo com vírgula abre com tudo numa coluna só; sem o BOM
 * ele lê o UTF-8 como Latin-1 e "Honorários" vira "HonorÃ¡rios". Os dois
 * juntos são o que faz o arquivo abrir certo com dois cliques.
 *
 * ➡️ `planilha.test.ts`.
 */

/** O que o Excel em pt-BR precisa ver antes do conteúdo. */
const BOM = "﻿";
const SEPARADOR = ";";

/** Uma célula, escapada.
 *
 * ⚠️ Aspas viram aspas dobradas, e a célula só ganha aspas quando precisa
 * (separador, aspas ou quebra de linha dentro dela). Aspas em tudo é válido
 * e polui o arquivo aberto num editor de texto.
 */
function celula(valor: string | number): string {
  const texto = String(valor ?? "");
  if (!/[";\n\r]/.test(texto)) return texto;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Linhas de células em texto CSV, com o BOM na frente. */
export function montarCsv(linhas: (string | number)[][]): string {
  return BOM + linhas.map((l) => l.map(celula).join(SEPARADOR)).join("\r\n");
}

/** Centavos como o Excel pt-BR espera: vírgula decimal e sem separador de
 * milhar.
 *
 * 🔴 Sem o separador de milhar de propósito. `1.234,56` com o ponto entra no
 * Excel como TEXTO em algumas configurações regionais, e uma coluna de texto
 * não soma -- que é a única coisa que se faz com uma planilha de fluxo de
 * caixa. O valor negativo mantém o sinal na frente.
 */
export function centavosParaPlanilha(centavos: number): string {
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** Entrega o arquivo ao navegador.
 *
 * ⚠️ `URL.revokeObjectURL` depois do clique: sem ele o blob fica preso na
 * memória da aba até recarregar, e quem exporta o ano inteiro várias vezes
 * acumula um por vez.
 */
export function baixarCsv(nomeDoArquivo: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeDoArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
