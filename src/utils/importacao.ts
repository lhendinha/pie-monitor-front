import { erroDaInscricao } from "./oab";
import type { ErroDaBuscaPorOab, EstadoDoAchado, ProcessoEncontrado } from "../types";

/** O que impede a busca de sair.
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
): ErroDaBuscaPorOab {
  /* A régua da INSCRIÇÃO mora em `utils/oab` desde que o perfil passou a
     cadastrar a própria -- duas cópias divergiriam no primeiro ajuste. Aqui
     ela é obrigatória: sem inscrição não há o que buscar. */
  const daInscricao = erroDaInscricao(numeroOab, ufOab, { obrigatoria: true });
  if (daInscricao) return daInscricao;
  /* 🔴 A única regra desta tela sem precedente no projeto: nenhum lugar da
   * API compara duas datas. Cada uma está certa -- errada é a ordem, e por
   * isso a frase não fala em "data inválida". */
  if (de && ate && de > ate) {
    return { campo: "periodo", mensagem: "A data inicial não pode ser posterior à final" };
  }
  return null;
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

/** O rótulo do campo de responsável, que acompanha a SELEÇÃO.
 *
 * ⚠️ Três formas, e a do meio é a que denuncia formulário mal feito:
 * "Responsável pelos 1 processos". Com zero marcado o número sai da frase --
 * "Responsável por 0 processos" descreve um estado que ninguém pediu.
 */
export function rotuloDeResponsavel(quantos: number): string {
  if (quantos === 0) return "Responsável";
  if (quantos === 1) return "Responsável pelo processo";
  return `Responsável pelos ${quantos} processos`;
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


/** Qual etiqueta a linha mostra. Os estados NÃO são exclusivos.
 *
 * 🔴 Um processo pode estar no destino **e** em Civil **e** num subgrupo
 * invisível, tudo ao mesmo tempo -- e a linha mostra UMA etiqueta. A ordem:
 *
 * 1. `ja_existe` ganha de tudo: é o único que muda o que dá para fazer, e
 *    omiti-lo faria a caixa parecer marcável quando o servidor vai recusar;
 * 2. o nome de um subgrupo visível, porque entre dizer *onde* e dizer *que
 *    existe*, dizer onde é melhor;
 * 3. "outro subgrupo", o que sobra;
 * 4. "novo".
 */
export function estadoDoAchado(p: ProcessoEncontrado): EstadoDoAchado {
  if (p.ja_existe) return "aqui";
  if (p.noutros_subgrupos.length > 0) return "noutro";
  if (p.em_outro_subgrupo) return "em_outro";
  return "novo";
}

/** O texto da etiqueta -- os QUATRO estados têm um, "novo" inclusive.
 *
 * ⚠️ Deixar a linha nova sem etiqueta parecia tirar ruído, e tirava
 * informação: numa coluna chamada "Situação", célula vazia se lê como dado
 * que faltou, não como "nada a declarar". A tela é de conferência, e a
 * pessoa precisa ver que o sistema OLHOU para aquela linha.
 */
export function etiquetaDoAchado(p: ProcessoEncontrado): string {
  switch (estadoDoAchado(p)) {
    case "aqui":
      return "já cadastrado aqui";
    case "noutro":
      /* Vírgula e não "e": a lista pode ter três, e "Civil, Criminal e
         Trabalhista" numa etiqueta de tabela quebra a linha. */
      return `já está em ${p.noutros_subgrupos.join(", ")}`;
    case "em_outro":
      return "já acompanhado por outro subgrupo";
    default:
      return "novo";
  }
}

/** Quantos já são acompanhados por algum outro subgrupo.
 *
 * 🔴 Conta os DOIS casos -- com nome e sem. Contar só `noutros_subgrupos`
 * diria "3" numa lista com cinco etiquetas cinza, e o número contradiria a
 * tela que está logo abaixo dele.
 */
export function quantosNoutroSubgrupo(processos: ProcessoEncontrado[]): number {
  return processos.filter((p) => p.noutros_subgrupos.length > 0 || p.em_outro_subgrupo).length;
}

/** Singular de verdade nos rótulos do resumo.
 *
 * ⚠️ Os rótulos eram fixos ("encontrados", "novos"), então com um processo a
 * fileira dizia "1 encontrados" -- enquanto o botão logo abaixo já acertava
 * ("Importar 1 processo"). Errar a concordância em metade da tela parece
 * descuido justamente onde ela pede confiança.
 */
export function concordar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}
