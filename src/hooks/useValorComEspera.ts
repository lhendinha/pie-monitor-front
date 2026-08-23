import { useEffect, useState } from "react";

import { ESPERA_DA_BUSCA_MS } from "../constants/busca";

/** O valor, mas só depois de `espera` milissegundos sem mudar.
 *
 * ⚠️ Substitui o `useDeferredValue`, que estava sendo usado como se fosse
 * debounce e não é. Ele não tem componente de TEMPO: só pula valores
 * intermediários quando o render é lento o bastante pra atrasar. Nestas
 * tabelas o render é rápido, então cada tecla comitava um valor deferido
 * novo -- digitar "silva" eram cinco requisições, cinco `queryKey` frias e
 * cinco piscadas da tabela.
 *
 * O comentário antigo dizia "sem timer pra limpar" como vantagem. O timer é
 * justamente o que faltava.
 */
export function useValorComEspera<T>(valor: T, espera: number = ESPERA_DA_BUSCA_MS): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setAtrasado(valor), espera);
    return () => clearTimeout(id);
  }, [valor, espera]);

  return atrasado;
}
