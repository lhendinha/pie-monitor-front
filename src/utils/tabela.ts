import type { ColunaDaTabela } from "../components/Tabela/types";

/** A coluna na forma completa, venha ela como string ou como objeto.
 *
 * 🔴 Em `utils/`, e não dentro do componente: é transformação de dado, não
 * desenho -- a mesma régua que levou `camposAlterados` e `mesmoValor` para
 * cá. E é ela que permite ao `Tabela` aceitar as duas formas sem que cada
 * chamador precise escolher a longa.
 *
 * ⚠️ A string curta é o caso comum (nome da coluna e nada mais); o objeto é
 * a exceção da coluna de dinheiro, que alinha à direita.
 */
export function colunaComRotulo(coluna: string | ColunaDaTabela): ColunaDaTabela {
  return typeof coluna === "string" ? { rotulo: coluna } : coluna;
}
