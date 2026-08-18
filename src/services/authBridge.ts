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
