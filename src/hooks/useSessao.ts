import { useCallback, useEffect, useState } from "react";

import { estaAutenticado, limparTokens, logout } from "../services";
import { setAutenticacaoInvalidaListener } from "../services/authBridge";

/** Estado de sessão do app: autenticado, sessão expirada, entrar e sair.
 *
 * Extraído do `App.tsx` na migração pro router. Antes vivia lá dentro junto
 * com a navegação por `abaAtiva`; separado, o `App` fica só com as rotas e
 * este arquivo fica com a única regra que interessa aqui -- quem pode ver o
 * app e o que acontece quando o token morre.
 */
export function useSessao() {
  const [autenticado, setAutenticado] = useState(() => estaAutenticado());
  const [sessaoExpirada, setSessaoExpirada] = useState(false);

  const entrar = useCallback(() => {
    setAutenticado(true);
    setSessaoExpirada(false);
  }, []);

  const sair = useCallback(async () => {
    await logout();
    setAutenticado(false);
    setSessaoExpirada(false);
  }, []);

  /** Diferente de `sair`: aqui a pessoa não pediu pra sair, o token morreu.
   * Marca `sessaoExpirada` pra tela de login explicar o que aconteceu, em vez
   * de simplesmente aparecer sem motivo. */
  const expirar = useCallback(() => {
    limparTokens();
    setAutenticado(false);
    setSessaoExpirada(true);
  }, []);

  /** Deixa o React Query disparar a mesma transição quando QUALQUER query ou
   * mutation levar 401 -- sem isso, só a chamada que falhou saberia, e a
   * pessoa ficaria numa tela vazia sem entender por quê.
   * Ver services/authBridge.ts e services/queryClient.ts. */
  useEffect(() => {
    setAutenticacaoInvalidaListener(expirar);
    return () => setAutenticacaoInvalidaListener(null);
  }, [expirar]);

  return { autenticado, sessaoExpirada, entrar, sair, expirar };
}
