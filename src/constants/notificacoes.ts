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

/** Os alvos possíveis -- espelha `ALVO_*` do backend. */
export const ALVO_TAREFA = "tarefa";
export const ALVO_ATENDIMENTO = "atendimento";
export const ALVO_PROCESSO = "processo";

/** Largura do painel do sino. Estreito o bastante pra caber ao lado do
 * botão em telas médias, largo o bastante pra uma frase não quebrar em
 * três linhas. */
export const LARGURA_DO_PAINEL_DO_SINO = 360;

/** Acima disso o contador vira "N+".
 *
 * Quem tem tantos avisos não lidos não precisa do número exato -- e três
 * dígitos não cabem no espaço. */
export const MAXIMO_NO_BADGE = 9;
