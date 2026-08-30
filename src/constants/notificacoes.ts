/** Como cada tipo de notificação vira frase e para onde ela leva.
 *
 * Aqui, e não no componente: é regra de apresentação compartilhada entre a
 * linha do sino e (quando existir) qualquer outra tela que mostre o mesmo
 * aviso.
 */

/** Os tipos que o servidor gera hoje -- espelha `NOTIFICACAO_*` do
 * backend. */
export const TIPO_TAREFA_ATRIBUIDA = "tarefa_atribuida";
export const TIPO_TAREFA_MOVIDA = "tarefa_movida";
export const TIPO_ATENDIMENTO_STATUS = "atendimento_status";
export const TIPO_LEMBRETE = "lembrete";
/** A pessoa foi movida de grupo, ou teve o papel alterado.
 *
 * 🔴 Não é só um aviso: é o gatilho que faz a sessão se corrigir. O token
 * carrega grupo e papel e dura 24h; o servidor passou a recusar token que
 * discorda do banco, e o front renova sozinho no 401. Mas numa aba PARADA não
 * sai requisição nenhuma (só a tela de Processos faz polling), e ela seguiria
 * mostrando o grupo antigo até alguém clicar em algo. Este tipo chega pelo
 * canal e antecipa a correção. */
export const TIPO_SESSAO_ALTERADA = "sessao_alterada";

/* --- "quem responde, recebe" (26/08/2026) ------------------------------- */

/** Alguém passou a responder por um processo/atendimento/documento. */
export const TIPO_PROCESSO_ATRIBUIDO = "processo_atribuido";

/** Muitos processos passaram a ser meus de uma vez -- o caso da importação
 * por OAB.
 *
 * 🔴 Existe porque o aviso individual não escala: mil processos atribuídos a
 * um colega dariam mil linhas no sino dele. O servidor agrega a partir de
 * DOIS; com um, continua vindo `processo_atribuido`, que leva ao processo em
 * si.
 *
 * ⚠️ **Chega sem `alvo_id`**, e não é descuido: não há UM processo para onde
 * ir. O destino é a lista filtrada por responsável -- ver a ressalva em
 * `destinoDaNotificacao`. */
export const TIPO_PROCESSOS_ATRIBUIDOS = "processos_atribuidos";

/** A importação automática trouxe processos novos por uma inscrição do
 * ESCRITÓRIO.
 *
 * 🔴 **Tipo próprio, e não `processos_atribuidos`.** Ali o processo já
 * existia e alguém colocou a pessoa como responsável; aqui o sistema
 * **criou** o processo, sem ninguém pedir. Reusar o outro faria o aviso
 * dizer que alguém agiu quando ninguém agiu.
 *
 * 🔴 **Vai para `manager`+, não para o subgrupo inteiro** -- e é a única
 * notificação do sistema com esse recorte. A razão é a AÇÃO disponível:
 * processos que chegam sem responsável precisam ser distribuídos, e um
 * `user` não pode fazer isso. As MOVIMENTAÇÕES desses mesmos processos
 * seguem avisando o subgrupo inteiro, pela régua de `destinatarios`.
 *
 * ⚠️ **Chega sem `alvo_id`**: não há UM processo para onde ir. O destino é a
 * listagem filtrada pelo subgrupo que os recebeu.
 *
 * ⚠️ **`titulo` e `detalhe` vêm PRONTOS do servidor** -- só ele sabe quantos
 * foram, de qual inscrição e para qual subgrupo. O detalhe cita a inscrição
 * porque são até 50 e elas **não são de quem recebe o aviso**: sem ela, o
 * gestor não sabe de quem é o acervo que acabou de chegar. */
export const TIPO_PROCESSOS_IMPORTADOS = "processos_importados";

/** Alguém saiu de um subgrupo e o acervo dele passou para mim.
 *
 * 🔴 UMA linha por saída, não uma por item: herdar o que era de um colega são
 * dezenas de itens de uma vez, e um aviso por item enterraria tudo que já
 * estava no sino.
 *
 * ⚠️ **Chega sem `alvo_id` E sem `alvo_tipo`**: são QUATRO listas diferentes
 * (tarefas, atendimentos, processos, documentos), e não há um item para onde
 * ir. A linha aparece com o texto e não é clicável -- mesmo tratamento de
 * `sessao_alterada`. */
export const TIPO_ITENS_REATRIBUIDOS = "itens_reatribuidos";
export const TIPO_ATENDIMENTO_ATRIBUIDO = "atendimento_atribuido";
export const TIPO_DOCUMENTO_ATRIBUIDO = "documento_atribuido";

/** Alguém DEIXOU de responder, porque outra pessoa a tirou da lista.
 *
 * 🔴 É o simétrico da régua: se receber aviso passa a depender de estar na
 * lista, sair dela é informação de quem saiu -- senão a pessoa deixa de ser
 * avisada de um prazo sem nunca saber que deixou. É a única perda que a
 * mudança introduz e que a listagem sozinha não denuncia (ela mostra o
 * estado, não a mudança). */
export const TIPO_PROCESSO_DESATRIBUIDO = "processo_desatribuido";
export const TIPO_ATENDIMENTO_DESATRIBUIDO = "atendimento_desatribuido";

/** Um documento foi anexado a algo pelo qual eu respondo.
 *
 * ⚠️ O ALVO é o processo/atendimento, não o documento: com vários anexos,
 * apontar pra um deles seria escolher arbitrariamente. O aviso leva pra aba
 * Documentos de lá. */
export const TIPO_DOCUMENTO_VINCULADO = "documento_vinculado";

/** Os alvos possíveis -- espelha `ALVO_*` do backend. */
export const ALVO_TAREFA = "tarefa";
export const ALVO_ATENDIMENTO = "atendimento";
export const ALVO_PROCESSO = "processo";
export const ALVO_DOCUMENTO = "documento";

/** Todos os tipos, para derivar a UNIÃO em `types/`.
 *
 * 🔴 Existe porque `Notificacao.tipo` era `string`, e um `switch` sobre
 * `string` não protege nada: um tipo novo vindo da API cai no `default` e o
 * sino mostra uma linha VAZIA -- sem o compilador dizer palavra. Com a união
 * fechada, o `default: never` de `textoDaNotificacao` cobra o caso novo.
 *
 * ⚠️ Deriva das constantes acima, nunca repete os valores: duas listas do
 * mesmo conjunto divergem no primeiro ajuste.
 *
 * ⚠️ E NÃO é um `enum` do TypeScript, de propósito. `enum` gera código em
 * runtime (entra no bundle), `const enum` não funciona com `isolatedModules`
 * -- que o Vite exige --, e o valor chega da API como string de JSON: com
 * união de literais a string JÁ é o tipo, com `enum` seria preciso converter
 * e validar na fronteira pro mesmo resultado.
 */
export const TIPOS_DE_NOTIFICACAO = [
  TIPO_TAREFA_ATRIBUIDA,
  TIPO_TAREFA_MOVIDA,
  TIPO_ATENDIMENTO_STATUS,
  TIPO_LEMBRETE,
  TIPO_SESSAO_ALTERADA,
  TIPO_PROCESSO_ATRIBUIDO,
  TIPO_PROCESSOS_ATRIBUIDOS,
  TIPO_PROCESSOS_IMPORTADOS,
  TIPO_ATENDIMENTO_ATRIBUIDO,
  TIPO_DOCUMENTO_ATRIBUIDO,
  TIPO_PROCESSO_DESATRIBUIDO,
  TIPO_ATENDIMENTO_DESATRIBUIDO,
  TIPO_DOCUMENTO_VINCULADO,
  TIPO_ITENS_REATRIBUIDOS,
] as const;

/** Todos os alvos, para derivar a união em `types/`. */
export const ALVOS_DE_NOTIFICACAO = [
  ALVO_TAREFA,
  ALVO_ATENDIMENTO,
  ALVO_PROCESSO,
  ALVO_DOCUMENTO,
] as const;

/** Largura do painel do sino. Estreito o bastante pra caber ao lado do
 * botão em telas médias, largo o bastante pra uma frase não quebrar em
 * três linhas. */
export const LARGURA_DO_PAINEL_DO_SINO = 360;

/** Acima disso o contador vira "N+".
 *
 * Quem tem tantos avisos não lidos não precisa do número exato -- e três
 * dígitos não cabem no espaço. */
export const MAXIMO_NO_BADGE = 9;
