import { useCallback, useEffect, useState } from "react";

import { estaAutenticado, getApelido, limparTokens, logout, salvarApelido } from "../services";
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
  /** 🔴 O apelido precisa ser ESTADO, não leitura de `localStorage` no render.
   *
   * `getApelido()` era chamado direto no corpo de cinco componentes. Com o
   * React Compiler ligado (vite.config.ts), uma chamada sem dependência é
   * memoizada por todo o mount -- e o `AppShell` não desmonta ao navegar.
   * Resultado: a pessoa editava o apelido, via "Perfil atualizado", e a
   * topbar logo acima continuava com o nome antigo a SESSÃO INTEIRA, até um
   * F5. No formulário era pior: `apelidoSalvo` ficava velho, então "Salvar"
   * continuava habilitado (parecia que não tinha salvo) e "Cancelar"
   * devolvia o nome ANTIGO, que já não era o do servidor.
   *
   * É exatamente o que o docstring de `salvarApelido` diz existir pra
   * evitar -- e não evitava, porque ninguém re-renderizava. */
  const [apelido, setApelidoEstado] = useState(() => getApelido() || "");

  const trocarApelido = useCallback((novo: string) => {
    salvarApelido(novo);
    setApelidoEstado(novo);
  }, []);

  const entrar = useCallback(() => {
    setAutenticado(true);
    setSessaoExpirada(false);
    // O login acabou de gravar o apelido -- traz pro estado.
    setApelidoEstado(getApelido() || "");
  }, []);

  /** ⚠️ NÃO espera a rede. `logout()` apaga os tokens locais de forma
   * síncrona, ANTES do `fetch` -- então o `await` não protegia nada, só
   * segurava a tela: em conexão ruim a pessoa clicava em "Sair" e continuava
   * logada, olhando a mesma tela, até o POST responder.
   *
   * O POST em si é best-effort (revoga o refresh token no servidor) e já
   * engole o próprio erro. Deixá-lo correr sozinho é o comportamento certo:
   * o que decide se a pessoa está dentro ou fora é o token local, e ele já
   * se foi quando esta linha executa. */
  const sair = useCallback(() => {
    void logout();
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

  return { autenticado, sessaoExpirada, apelido, entrar, sair, expirar, trocarApelido };
}
