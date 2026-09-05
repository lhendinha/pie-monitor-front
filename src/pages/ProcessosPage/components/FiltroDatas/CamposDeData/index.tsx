import { Box } from "@chakra-ui/react";

import { Rotulo, SeletorData } from "../../../../../components";
import { COLUNA_DATAS } from "../../../../../theme/painelFiltro";
import type { CamposDeDataProps } from "./types";

/** Os dois campos de data do painel, com seus rótulos.
 *
 * 250px dentro de um painel de 340px, com folga à direita: é assim no
 * artifact -- a largura do painel é a mesma dos painéis de situação e fase,
 * e o conteúdo não a preenche.
 */
export default function CamposDeData({
  verificar,
  prazo,
  onVerificar,
  onPrazo,
  calendario,
  onCalendario,
}: CamposDeDataProps) {
  return (
    <Box w={COLUNA_DATAS.largura} p={COLUNA_DATAS.padding}>
      <Rotulo variante="filtro" id="rotulo-filtro-verificar" mb="6px">
        Data p/ verificar (até)
      </Rotulo>
      <SeletorData
        id="filtro-verificar"
        rotuladoPor="rotulo-filtro-verificar"
        valor={verificar}
        onMudar={onVerificar}
        placeholder="Qualquer data"
        aberto={calendario === "verificar"}
        onAbertura={(a) => onCalendario("verificar", a)}
      />

      <Rotulo
        variante="filtro"
        id="rotulo-filtro-prazo"
        mb="6px"
        mt={COLUNA_DATAS.espacoEntreCampos}
      >
        Prazo final (até)
      </Rotulo>
      <SeletorData
        id="filtro-prazo"
        rotuladoPor="rotulo-filtro-prazo"
        valor={prazo}
        onMudar={onPrazo}
        placeholder="Qualquer data"
        aberto={calendario === "prazo"}
        onAbertura={(a) => onCalendario("prazo", a)}
      />
    </Box>
  );
}
