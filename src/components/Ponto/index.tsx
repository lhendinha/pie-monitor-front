import { Box } from "@chakra-ui/react";
import type { PontoProps } from "./types";

/** ⚠️ Mapa, e não uma escada de ternários: com quatro tons a escada passa a
 * esconder qual cor sai de qual tom. */
const CORES_DO_PONTO = {
  marca: "fg.brand",
  ruim: "status.bad",
  bom: "status.good",
  neutro: "fg.subtle",
} as const;

/** A bolinha que abre um item de lista (o "•" do artifact).
 *
 * Um componente porque são quatro listas com a mesma bolinha --
 * movimentações, tarefas vinculadas, processos do cliente e histórico -- e
 * já houve um pedido explícito pra que todas tivessem o mesmo tamanho.
 * Quatro cópias de `9px` divergem no primeiro ajuste.
 */
export default function Ponto({ tom = "marca", noTopo }: PontoProps) {
  return (
    <Box
      aria-hidden="true"
      w="9px"
      h="9px"
      mt={noTopo ? "6px" : undefined}
      flex="0 0 auto"
      borderRadius="full"
      bg={CORES_DO_PONTO[tom]}
    />
  );
}
