import {
  SITUACAO_ABERTO,
  SITUACAO_ATRASADO,
  SITUACAO_EFETIVADO,
  TIPO_ENTRADA,
  TIPO_HONORARIO,
  TIPO_SAIDA,
  TIPO_TRANSFERENCIA,
} from "../../constants";

/** As quatro abas da tela.
 *
 * A primeira é o padrão: Lançamentos é o que responde "o que entrou e saiu",
 * e é onde se trabalha todo dia. Configurações fica por último porque se
 * mexe nela uma vez.
 *
 * ⚠️ `pendente` marca a aba cujo conteúdo ainda não existe. Ela APARECE
 * mesmo assim: as quatro abas são a estrutura da tela, e escondê-las faria
 * `/financeiro` parecer ser só uma tela de configuração. O que a pendente
 * mostra é uma frase dizendo que aquela parte ainda não chegou -- clicar e
 * não acontecer nada é que seria ruim.
 *
 * ⚠️ O nome do parâmetro na URL (`?aba=`) e o `abaValida` que o lê são
 * compartilhados -- ver `utils/abas`. Aqui fica só o que é desta tela.
 */
export const ABAS_DO_FINANCEIRO = [
  { id: "lancamentos", rotulo: "Lançamentos", pendente: false },
  { id: "faturas", rotulo: "Faturas", pendente: true },
  { id: "fluxo", rotulo: "Fluxo de caixa", pendente: true },
  { id: "configuracoes", rotulo: "Configurações", pendente: false },
] as const;

/** O prefixo dos ids de acessibilidade que ligam cada aba ao seu painel. */
export const GRUPO_DE_ABAS = "financeiro";

/** As colunas das três tabelas do catálogo.
 *
 * ⚠️ A última é `""` de propósito: é a coluna das ações, que no artifact é
 * um `<th></th>` -- o cabeçalho existe para a contagem de colunas bater,
 * mas não tem nome. Mesma convenção de `COLUNAS_CLIENTES`.
 */
export const COLUNAS_DE_CATEGORIAS = ["Categoria", "Natureza", ""] as const;
/** ⚠️ O saldo fica à ESQUERDA como todo o resto: a coluna vazia das ações,
 * à direita dele, já dá a separação -- e alinhar só esta coluna à direita
 * deixava o cabeçalho "boiando" no meio da coluna, brigando com o valor. */
export const COLUNAS_DE_CONTAS = ["Conta", "Dados bancários", "Saldo atual", ""] as const;

export const COLUNAS_DE_CENTROS = ["Centro de custo", ""] as const;

/** As colunas da tabela de lançamentos.
 *
 * ⚠️ A última é `""` pela mesma convenção das do catálogo: é a coluna do
 * valor, alinhada à direita, e o cabeçalho dela seria "Valor" repetido --
 * o número já se explica. Ver `COLUNAS_DE_CONTAS`.
 */
export const COLUNAS_DE_LANCAMENTOS = [
  "Descrição",
  "Categoria",
  "Conta",
  "Vencimento",
  "Situação",
  "Valor",
] as const;

/** O filtro de tipo, na barra.
 *
 * ⚠️ "Todos" é `""` e não um id próprio: é o que a API entende por "sem
 * filtro", e um valor inventado viraria um `?tipo=todos` que não casa com
 * lançamento nenhum. */
export const OPCOES_DE_TIPO = [
  { id: "", rotulo: "Todos os tipos" },
  { id: TIPO_HONORARIO, rotulo: "Honorários" },
  { id: TIPO_ENTRADA, rotulo: "Entradas" },
  { id: TIPO_SAIDA, rotulo: "Saídas" },
  { id: TIPO_TRANSFERENCIA, rotulo: "Transferências" },
] as const;

/** O filtro de situação.
 *
 * 🔴 "Aberto" INCLUI "atrasado" -- atrasado é um aberto que venceu, e quem
 * filtra por aberto quer os dois. É a régua do servidor, e repeti-la aqui
 * seria uma segunda fonte de verdade; a tela só oferece as três. */
export const OPCOES_DE_SITUACAO = [
  { id: "", rotulo: "Todas as situações" },
  { id: SITUACAO_ABERTO, rotulo: "Em aberto" },
  { id: SITUACAO_ATRASADO, rotulo: "Atrasados" },
  { id: SITUACAO_EFETIVADO, rotulo: "Efetivados" },
] as const;

/** O que a etiqueta de situação escreve.
 *
 * ⚠️ "Em aberto" e não "Aberto": a etiqueta fica ao lado de "Atrasado" e
 * "Efetivado", e o adjetivo sozinho lia como se fosse o nome de um estado
 * do sistema. */
export const ROTULO_DA_SITUACAO: Record<string, string> = {
  [SITUACAO_ABERTO]: "Em aberto",
  [SITUACAO_ATRASADO]: "Atrasado",
  [SITUACAO_EFETIVADO]: "Efetivado",
};
