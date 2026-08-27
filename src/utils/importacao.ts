import type { ProcessoEncontrado } from "../types";

/** O que impede a busca de sair, com a frase que a pessoa lê.
 *
 * 🔴 **A UF sozinha não filtra nada** -- medido contra o PJe: mandar só ela é
 * o mesmo que mandar um parâmetro inventado, e a resposta vem com a base
 * inteira. Aceitar essa combinação cadastraria processos de outra pessoa.
 *
 * ⚠️ Valida ANTES de consultar. Gastar os segundos da busca para descobrir
 * que o campo está em branco é tempo jogado fora -- e a resposta viria com a
 * cara errada ("nada encontrado" em vez de "faltou preencher").
 */
export function erroDaBusca(
  numeroOab: string,
  ufOab: string,
  de: string,
  ate: string,
): string {
  if (!numeroOab.trim()) return "Informe o número da OAB";
  if (!/^\d+$/.test(numeroOab.trim())) return "O número da OAB tem só dígitos";
  if (!ufOab) return "Selecione a UF da OAB";
  /* 🔴 A única regra desta tela sem precedente no projeto: nenhum lugar da
   * API compara duas datas. Cada uma está certa -- errada é a ordem, e por
   * isso a frase não fala em "data inválida". */
  if (de && ate && de > ate) return "A data inicial não pode ser posterior à final";
  return "";
}

/** Quais processos podem ser marcados: os que ainda não estão no subgrupo.
 *
 * ⚠️ Importar nunca sobrescreve, então marcar um já existente não teria
 * efeito nenhum -- e uma caixa que não faz nada é pior que uma caixa
 * ausente.
 */
export function selecionaveis(processos: ProcessoEncontrado[]): string[] {
  return processos.filter((p) => !p.ja_existe).map((p) => p.numero_processo);
}

/** A frase do botão de confirmar.
 *
 * ⚠️ Singular de verdade: "Importar 1 processos" é o erro que aparece só
 * quando alguém testa com um item -- e é justamente o caso que ninguém testa
 * à mão.
 */
export function rotuloDeImportar(quantos: number): string {
  if (quantos === 0) return "Importar";
  return `Importar ${quantos} ${quantos === 1 ? "processo" : "processos"}`;
}

/** O que dizer depois de gravar.
 *
 * 🔴 **`ja_existiam` não é falha**, e a frase não pode misturá-lo com
 * `falharam`: alguém cadastrou pela tela entre a prévia e a confirmação, e o
 * servidor recusou de propósito. Contar isso como erro faria a tela acusar
 * defeito onde o sistema funcionou como devia.
 */
export function resumoDaImportacao(r: {
  cadastrados: number;
  ja_existiam: number;
  falharam: string[];
}): string {
  const partes = [
    `${r.cadastrados} ${r.cadastrados === 1 ? "processo importado" : "processos importados"}`,
  ];
  if (r.ja_existiam > 0) {
    partes.push(`${r.ja_existiam} já ${r.ja_existiam === 1 ? "estava" : "estavam"} aqui`);
  }
  if (r.falharam.length > 0) {
    partes.push(
      `${r.falharam.length} ${r.falharam.length === 1 ? "não entrou" : "não entraram"}`,
    );
  }
  return partes.join(" · ");
}
