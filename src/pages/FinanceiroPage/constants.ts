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
  { id: "lancamentos", rotulo: "Lançamentos", pendente: true },
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
export const COLUNAS_DE_CONTAS = [
  "Conta",
  "Dados bancários",
  /* ⚠️ À direita, e é a única coluna do sistema assim: dinheiro se compara
     pelos dígitos, e à esquerda "R$ 1.234,56" e "R$ 11.880,55" não alinham
     na vírgula. O cabeçalho acompanha o valor -- header à esquerda com
     número à direita foi o que apareceu quebrado na tela. */
  { nome: "Saldo atual", alinhamento: "right" } as const,
  "",
] as const;
export const COLUNAS_DE_CENTROS = ["Centro de custo", ""] as const;
