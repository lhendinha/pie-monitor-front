import type { OpcaoDeNovoLancamento } from "./components/MenuDeNovoLancamento/types";
import {
  NATUREZA_ENTRADA,
  NATUREZA_SAIDA,
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
 * 🔴 **Quem escolhe o que mostrar é a PÁGINA**, com um painel por aba, cada
 * um dizendo o seu conteúdo. Antes ela deduzia ("não é pendente, então é
 * Configurações"), o que funcionava enquanto Configurações era a única
 * pronta: virar `pendente: false` em Lançamentos, antes de a lista existir,
 * fez a aba mostrar a tela de Configurações INTEIRA. Escolha escrita não
 * erra de aba; escolha deduzida erra.
 *
 * ⚠️ **O `pendente` saiu na Fase 6**, junto com `AindaNaoChegou`: com as
 * quatro abas prontas, nada mais o lia. Ele foi útil enquanto marcava a aba
 * sem conteúdo -- as quatro apareciam de qualquer jeito, porque são a
 * estrutura da tela, e a pendente dizia que aquela parte ainda não chegou.
 * Uma aba nova que nasça vazia traz os dois de volta.
 *
 * ⚠️ O nome do parâmetro na URL (`?aba=`) e o `abaValida` que o lê são
 * compartilhados -- ver `utils/abas`. Aqui fica só o que é desta tela.
 */
export const ABAS_DO_FINANCEIRO = [
  { id: "lancamentos", rotulo: "Lançamentos" },
  { id: "faturas", rotulo: "Faturas" },
  { id: "fluxo", rotulo: "Fluxo de caixa" },
  { id: "configuracoes", rotulo: "Configurações" },
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
  /* 🔴 À direita, como a célula: o número é alinhado à direita para duas
     quantias serem comparáveis na vertical, e um cabeçalho à esquerda fica
     pendurado longe da coluna que nomeia. É `th.direita` no artefato. */
  { rotulo: "Valor", aDireita: true },
] as const;

/** O filtro de tipo, na barra.
 *
 * ⚠️ "Todos" é `""` e não um id próprio: é o que a API entende por "sem
 * filtro", e um valor inventado viraria um `?tipo=todos` que não casa com
 * lançamento nenhum. */
/** O filtro de NATUREZA -- o lado do dinheiro, seja qual for o tipo.
 *
 * 🔴 Existe separado de `OPCOES_DE_TIPO` porque responde outra pergunta:
 * "tudo que entra" são honorários E entradas, e nenhuma opção de tipo diz
 * isso. É o filtro que os cards de totais aplicam.
 *
 * ⚠️ As palavras são deliberadamente OUTRAS ("tudo que entra", e não
 * "entradas"): a pílula de tipo já tem uma opção chamada "Entradas", que é o
 * tipo `entrada` sozinho. Duas pílulas mostrando a mesma palavra com
 * recortes diferentes seria pior que não ter a segunda. */
export const OPCOES_DE_NATUREZA = [
  { id: "", rotulo: "Entradas e saídas" },
  { id: NATUREZA_ENTRADA, rotulo: "Tudo que entra" },
  { id: NATUREZA_SAIDA, rotulo: "Tudo que sai" },
] as const;

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

/** O "Tipo" do formulário de entrada e de saída -- e ele NÃO é o `tipo` do
 * lançamento.
 *
 * 🔴 Para a API, toda entrada é `entrada` e toda saída é `saida`. Este
 * campo existe por duas razões, as duas do artefato: levar quem abriu o
 * formulário errado para o de honorário, e dizer se o dinheiro é de um
 * CLIENTE -- que é o que troca o campo de contraparte pelo de cliente, e o
 * que faz a despesa entrar na fatura dele.
 *
 * ⚠️ `honorario` não é uma forma: é uma porta. Escolhê-lo fecha este modal e
 * abre o de honorário, que tem processo, cliente e parcelas. */
export const FORMA_AVULSA = "avulsa";
export const FORMA_DE_CLIENTE = "cliente";
export const FORMA_HONORARIO = "honorario";

export const FORMAS_DA_ENTRADA = [
  { value: FORMA_AVULSA, label: "Entrada avulsa" },
  { value: FORMA_DE_CLIENTE, label: "Adiantamento de despesa" },
  { value: FORMA_HONORARIO, label: "Honorário" },
];

export const FORMAS_DA_SAIDA = [
  { value: FORMA_AVULSA, label: "Saída avulsa" },
  { value: FORMA_DE_CLIENTE, label: "Despesa de cliente" },
];

/** As quatro portas do botão "+ Novo lançamento", na ordem e com as frases
 * do artefato.
 *
 * ⚠️ "Outra entrada", e não "Entrada": o nome existe em contraste com
 * Honorário, que é a entrada mais comum e tem porta própria logo acima. */
export const OPCOES_DE_NOVO_LANCAMENTO: OpcaoDeNovoLancamento[] = [
  {
    forma: TIPO_HONORARIO,
    rotulo: "Honorário",
    descricao: "A receber de um cliente, por processo ou atendimento",
    tom: "bom",
  },
  {
    forma: TIPO_ENTRADA,
    rotulo: "Outra entrada",
    descricao: "Adiantamento de despesa, rendimento, reembolso",
    tom: "marca",
  },
  {
    forma: TIPO_SAIDA,
    rotulo: "Saída",
    descricao: "Despesa do escritório ou de um cliente",
    tom: "ruim",
  },
  {
    forma: TIPO_TRANSFERENCIA,
    rotulo: "Transferência",
    descricao: "Entre duas contas do escritório",
    tom: "neutro",
  },
];

/** As duas situações que o formulário de entrada e de saída oferece.
 *
 * 🔴 Não é o filtro `OPCOES_DE_SITUACAO`: lá "atrasado" existe, e aqui não --
 * ninguém CRIA um lançamento atrasado, a situação é derivada da data. Aqui a
 * pergunta é outra: "isto já aconteceu?".
 *
 * ⚠️ As palavras mudam com o lado do dinheiro ("Recebida" numa entrada,
 * "Paga" numa saída), como no artefato -- a mesma data no banco, e a palavra
 * errada faria a tela de uma despesa dizer que alguém recebeu. */
export const SITUACOES_DA_ENTRADA = [
  { value: SITUACAO_ABERTO, label: "A receber" },
  { value: SITUACAO_EFETIVADO, label: "Recebida" },
];

export const SITUACOES_DA_SAIDA = [
  { value: SITUACAO_ABERTO, label: "A pagar" },
  { value: SITUACAO_EFETIVADO, label: "Paga" },
];

/** Teto de largura das duas colunas de TEXTO da lista de lançamentos.
 *
 * 🔴 Sem ele, `truncate` não morde: em tabela de layout automático o texto
 * alarga a coluna em vez de cortar. Medido em Chrome quando a transferência
 * passou a mostrar as duas contas ("Bradesco - honorários → Caixa do
 * escritório"): a tabela foi a 1170px dentro de 1130px visíveis, e a coluna
 * VALOR terminava em x=1443 numa janela de 1440 -- o número mais importante
 * da tela saía dela.
 *
 * ⚠️ Vale para categoria e conta, as duas que recebem nome de cadastro e
 * podem crescer sem limite. Descrição não entra: ela é a coluna principal, e
 * é dela que sobra o espaço. */
export const LARGURA_MAXIMA_DA_COLUNA_DE_TEXTO = "200px";

/** As duas seções da aba Faturas, em pílula.
 *
 * ⚠️ Pílula e não sub-aba, pela mesma razão do catálogo: são dois recortes
 * de UMA tela, e sub-aba dentro de aba dá dois níveis de navegação na mesma
 * página. "A faturar" vem primeiro porque é a que pede ação -- "Emitidas" é
 * consulta.
 */
export const SECOES_DE_FATURAS = [
  { id: "a-faturar", rotulo: "A faturar" },
  { id: "emitidas", rotulo: "Emitidas" },
] as const;

export const COLUNAS_A_FATURAR = [
  "Cliente",
  { rotulo: "Honorários", aDireita: true },
  { rotulo: "Despesas", aDireita: true },
  { rotulo: "Total", aDireita: true },
] as const;

export const COLUNAS_DE_FATURAS = [
  "Número",
  "Cliente",
  "Vencimento",
  "Pagamento",
  { rotulo: "Valor", aDireita: true },
  "Situação",
] as const;

/** As colunas do documento da fatura -- o que ela cobra, linha a linha.
 *
 * ⚠️ Sem "Situação": dentro de uma fatura, a situação de cada linha não é
 * escolha de ninguém -- pagar a fatura efetiva todas as abertas de uma vez.
 * O que a linha precisa dizer é o que é e quanto vale. */
export const COLUNAS_DO_DOCUMENTO = [
  "Lançamento",
  "Vencimento",
  { rotulo: "Valor", aDireita: true },
] as const;

/** As colunas da prévia da emissão. A primeira é a caixa de marcar, e o
 * cabeçalho dela é vazio -- como o `<th style="width:36px">` do artefato. */
export const COLUNAS_DA_EMISSAO = [
  "",
  "Lançamento",
  "Vencimento",
  { rotulo: "Valor", aDireita: true },
] as const;

/** A janela do "A pagar" da Área de trabalho, em dias.
 *
 * 🔴 O MESMO número que a API usa (`lancamentos_consulta.DIAS_DO_A_PAGAR`), e
 * ele aparece em três lugares: o rótulo da linha, o filtro que o clique
 * aplica e a soma do servidor. Três literais divergiriam no primeiro ajuste,
 * e aí o número da linha deixaria de bater com a lista que ela abre.
 */
export const DIAS_DO_A_PAGAR = 7;
