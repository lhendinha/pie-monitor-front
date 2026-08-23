import { Box } from "@chakra-ui/react";

import { Rotulo } from "../../../../components";
import LinhaDoResumo from "../LinhaDoResumo";
import type { NumeroDoResumo } from "../../types";

interface Props {
  rotulo: string;
  numeros: NumeroDoResumo[];
  /** O primeiro grupo não afasta do topo -- o cabeçalho do cartão já
   * separa. */
  primeiro?: boolean;
}

/** Um bloco nomeado do "Resumo rápido" ("Precisa de atenção", "Panorama").
 *
 * A divisão não é enfeite: o primeiro grupo é o que pede ação hoje, o
 * segundo é contexto. Misturados, um prazo vencido apareceria com o mesmo
 * peso da contagem total de processos.
 */
export default function GrupoDeNumeros({ rotulo, numeros, primeiro }: Props) {
  return (
    <Box>
      <Rotulo variante="filtro" as="p" mt={primeiro ? "0" : "14px"} mb="2px">
        {rotulo}
      </Rotulo>
      {numeros.map((n) => (
        <LinhaDoResumo key={n.rotulo} numero={n} />
      ))}
    </Box>
  );
}
