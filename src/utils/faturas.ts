import { FATURA_ABERTA, FATURA_CANCELADA, FATURA_PAGA } from "../constants";
import type { Fatura } from "../types";
import { hojeISO } from "./prazo";

/** A situação que a TELA mostra para uma fatura.
 *
 * 🔴 **"Atrasada" não existe no servidor**, e é de propósito: a fatura tem
 * três situações gravadas (`aberta`, `paga`, `cancelada`), e atraso é uma
 * leitura da data contra o dia de hoje. Mantê-lo em dia no banco exigiria
 * reescrever toda fatura aberta todas as noites -- a mesma decisão que o
 * lançamento já tomou, e que `Lancamento.situacao` documenta.
 *
 * ⚠️ A diferença é ONDE se deriva: no lançamento é o servidor que faz, na
 * leitura; aqui é a tela, porque a resposta não traz. Uma função só, para
 * não haver duas respostas para a mesma pergunta.
 *
 * ⚠️ Vencer HOJE não é atraso -- é o último dia, e a régua é a mesma do
 * `datas.py` da API.
 */
export function situacaoDaFaturaNaTela(fatura: Fatura, hoje = hojeISO()): string {
  if (fatura.situacao !== FATURA_ABERTA) return fatura.situacao;
  return fatura.data_vencimento && fatura.data_vencimento < hoje ? "atrasada" : FATURA_ABERTA;
}

/** O que a etiqueta escreve, por situação de TELA. */
export const ROTULO_DA_FATURA: Record<string, string> = {
  [FATURA_ABERTA]: "Em aberto",
  atrasada: "Atrasada",
  [FATURA_PAGA]: "Paga",
  [FATURA_CANCELADA]: "Cancelada",
};
