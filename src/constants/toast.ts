/** Quanto tempo um aviso fica na tela.
 *
 * 4,5s: tempo de ler uma frase de erro sem pressa, e curto o bastante pra
 * não empilhar avisos quando várias ações falham em seguida.
 */
export const DURACAO_DO_AVISO_MS = 4500;

/** Quanto tempo vive um aviso que oferece DESFAZER: 9s, do artefato validado.
 *
 * 🔴 Separado do de cima, e mais longo, porque o gesto é outro: não é só ler a
 * frase, é ler, perceber que errou o alvo e alcançar o botão. É nesses segundos
 * que o desfazer existe.
 *
 * ⚠️ A barrinha que drena no pé do aviso usa ESTE número. Os dois precisam ser
 * o mesmo, senão ela acaba antes do aviso sumir, ou o aviso some com a barra
 * pela metade -- e a janela deixa de ser honesta.
 */
export const DURACAO_DO_AVISO_COM_DESFAZER_MS = 9000;
