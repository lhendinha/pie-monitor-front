/** Ponte entre o QueryClient (singleton fora da árvore React) e o `App.tsx`
 * (que faz o setState de transição de tela quando a sessão expira). O
 * QueryCache/MutationCache do queryClient dispara isso em qualquer 401;
 * o App.tsx registra o listener real num useEffect no mount. */
let listener: (() => void) | null = null;

export function setAutenticacaoInvalidaListener(fn: (() => void) | null) {
  listener = fn;
}

export function dispararAutenticacaoInvalida() {
  listener?.();
}


/** 🔴 Segunda ponte, e ela precisa ser SEPARADA da de cima.
 *
 * `listener` tem uma vaga só: reusá-lo aqui atropelaria a transição de sessão
 * expirada, que é outro evento e outra reação.
 *
 * O caso: quando alguém é movido de grupo, o token é renovado e passa a valer
 * pro grupo NOVO -- mas o React Query continua com os dados do grupo ANTIGO em
 * cache. Uma tela já montada seguiria mostrando o que era do outro escritório
 * até algo forçar refetch. É o mesmo vazamento que a verificação de sessão
 * fecha no servidor, só que do lado do cliente.
 *
 * Quem dispara é `auth.salvarTokens`, que compara o grupo do token novo com o
 * guardado -- então vale pros DOIS caminhos: o aviso pelo canal e o
 * 401 -> refresh. Quem registra é `queryClient.ts`, que é dono do cache e já
 * importa este módulo (`auth.ts` não pode importar o queryClient: ele já é
 * importado por lá, e o ciclo quebraria).
 */
let aoTrocarDeGrupo: (() => void) | null = null;

export function setGrupoTrocadoListener(fn: (() => void) | null) {
  aoTrocarDeGrupo = fn;
}

export function dispararGrupoTrocado() {
  aoTrocarDeGrupo?.();
}
