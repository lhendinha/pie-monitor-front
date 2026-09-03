/** O que o `useToast()` entrega a quem chama.
 *
 * Fora do `index.tsx` pela regra do projeto: interface que não é as props do
 * componente mora em `types.ts` da própria pasta. */
export interface ToastContextValue {
  erro: (mensagem: string) => void;
  sucesso: (mensagem: string) => void;
}

/** O que o `SessaoContext` entrega -- o retorno inteiro de `useSessao`.
 *
 * Aqui e não dentro do `SessaoContext.tsx` pela mesma regra: interface que
 * não são as props do componente sai do arquivo dele. */
export type Sessao = ReturnType<typeof import("../hooks/useSessao").useSessao>;
