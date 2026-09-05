import { useQuery } from "@tanstack/react-query";

import { conteudoDoSubgrupo } from "../../../services";
import { qk } from "../../../services/queryKeys";
import type { ConteudoDoSubgrupo } from "../../../types";

/** O que ainda existe dentro do subgrupo, perguntado só quando alguém pede
 * pra excluir -- `id` nulo mantém a consulta desligada.
 *
 * Existe pra a tela saber ANTES de confirmar. Sem isso ela mostraria
 * "tem certeza?" pra uma exclusão que o servidor ia recusar, e os
 * impedimentos só apareceriam depois, em forma de erro.
 */
export function useConteudoDoSubgrupo(id: string | null) {
  return useQuery<ConteudoDoSubgrupo>({
    queryKey: qk.conteudoDoSubgrupo(id || ""),
    queryFn: () => conteudoDoSubgrupo(id || ""),
    enabled: Boolean(id),
    /** Nada de cache velho aqui: entre uma tentativa e outra a pessoa pode
     * ter esvaziado o subgrupo, e um número desatualizado a impediria de
     * excluir algo que já está vazio. */
    staleTime: 0,
    // 🔴 `staleTime: 0` só MARCA como stale -- o `data` do cache é entregue
    // na hora e `isPending` fica `false`. Do 2º clique na lixeira em diante
    // (dentro dos 5 min de `gcTime` padrão) o diálogo abria com a contagem
    // ANTIGA e o botão "Excluir" já liberado, sem passar pelo "Verificando".
    // Nos dois sentidos: bloqueava o que já estava vazio, e liberava o que
    // já tinha conteúdo -- mandando um DELETE que volta 409 como toast
    // solto, o erro que toda esta pré-verificação existe pra evitar.
    gcTime: 0,
  });
}
