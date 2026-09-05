import { Popover, Portal, Stack } from "@chakra-ui/react";
import { useState } from "react";

import { OpcaoDeLinha, PilulaDeFiltro } from "../../../../components";
import { PAINEL } from "../../../../theme/painelFiltro";
import { VISOES, rotuloDaVisao } from "../../constants";
import type { VisaoDaAgenda } from "../../types";
import type { SeletorDeVisaoProps } from "./types";

/** A pílula que troca a visão da Agenda (`#agenda-view-btn` do artifact).
 *
 * Fica sempre ACESA: diferente dos filtros, não existe "sem visão" -- uma
 * delas está sempre valendo, e apagar a pílula sugeriria que dá pra
 * desligá-la.
 */
export default function SeletorDeVisao({
  visao,
  onMudar,
  desabilitado,
  motivo,
}: SeletorDeVisaoProps) {
  const [aberto, setAberto] = useState(false);

  function escolher(nova: VisaoDaAgenda) {
    onMudar(nova);
    setAberto(false);
  }

  return (
    <Popover.Root
      open={aberto && !desabilitado}
      onOpenChange={(e) => setAberto(e.open)}
      /* Mesmas duas travas do `SeletorDePeriodo`: sem `unmountOnExit` o
         painel fechado fica plantado na tela, porque a animação de saída não
         roda com `preflight: false`. */
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-start", gutter: PAINEL.margemTopo }}
    >
      <Popover.Trigger asChild>
        <PilulaDeFiltro ativo disabled={desabilitado} title={desabilitado ? motivo : undefined}>
          {rotuloDaVisao(visao)}
        </PilulaDeFiltro>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w={`${PAINEL.largura}px`} p={PAINEL.padding} borderRadius="md">
            <Stack gap="2px">
              {VISOES.map((opcao) => (
                <OpcaoDeLinha
                  key={opcao.id}
                  ativa={opcao.id === visao}
                  onClick={() => escolher(opcao.id)}
                >
                  {opcao.rotulo}
                </OpcaoDeLinha>
              ))}
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
