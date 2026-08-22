import { Popover, Portal } from "@chakra-ui/react";
import { useState } from "react";

import { PilulaDeFiltro, RodapeDeFiltro } from "../../../../components";
import { SELETOR_CALENDARIO } from "../../../../constants/camadaFlutuante";
import { PAINEL } from "../../../../theme/painelFiltro";
import { contar } from "../../../../utils";
import CamposDeData from "./CamposDeData";

interface Props {
  dataVerificarAte: string;
  prazoFinalAte: string;
  onMudar: (parcial: { dataVerificarAte?: string; prazoFinalAte?: string }) => void;
}

/** As duas datas atrás de um chip só, como no artifact.
 *
 * A escolha vira rascunho e só vale no "Aplicar", igual aos painéis de
 * situação e fase -- sem isso, escolher as duas datas dispararia duas
 * buscas, e a primeira delas com um filtro que a pessoa nem terminou de
 * montar.
 */
export default function FiltroDatas({ dataVerificarAte, prazoFinalAte, onMudar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [verificar, setVerificar] = useState(dataVerificarAte);
  const [prazo, setPrazo] = useState(prazoFinalAte);
  /** Só um calendário aberto por vez: abrir um é a mesma operação que
   * fechar o outro. */
  const [calendario, setCalendario] = useState<"verificar" | "prazo" | null>(null);

  const quantas = [dataVerificarAte, prazoFinalAte].filter(Boolean).length;
  // O artifact conta as datas em vez de mostrá-las: "2 datas" cabe na
  // pílula, duas datas por extenso não cabem.
  const rotulo = quantas > 0 ? contar(quantas, "data", "datas") : "Datas";

  function aoMudarAbertura(estaAberto: boolean) {
    if (estaAberto) {
      // O rascunho nasce do que está aplicado: reabrir depois de fechar sem
      // aplicar não pode trazer de volta o que foi descartado.
      setVerificar(dataVerificarAte);
      setPrazo(prazoFinalAte);
    }
    setCalendario(null);
    setAberto(estaAberto);
  }

  function fechar() {
    setCalendario(null);
    setAberto(false);
  }

  function aplicar() {
    onMudar({ dataVerificarAte: verificar, prazoFinalAte: prazo });
    fechar();
  }

  function limpar() {
    onMudar({ dataVerificarAte: "", prazoFinalAte: "" });
    fechar();
  }

  return (
    <Popover.Root
      open={aberto}
      onOpenChange={(e) => aoMudarAbertura(e.open)}
      /* ⚠️ O calendário é portalado pra `document.body`, então clicar num
         dia conta como clique FORA e fechava o filtro inteiro antes de dar
         pra clicar em Aplicar. `persistentElements` diz ao Popover que
         aquele pedaço solto também é dele. */
      persistentElements={[() => document.querySelector(SELETOR_CALENDARIO)]}
      /* ⚠️ Sem `unmountOnExit` o painel fechado continua no DOM com
         `display:flex` e `opacity:1` -- a moldura de 340px ficava plantada
         na tela depois de fechar. A animação de saída que deveria escondê-la
         não roda com `preflight: false`. */
      lazyMount
      unmountOnExit
      /* Alinhado pela ESQUERDA da pílula, como os painéis de situação e
         fase -- o padrão do Chakra centraliza. */
      positioning={{ placement: "bottom-start", gutter: PAINEL.margemTopo }}
    >
      <Popover.Trigger asChild>
        <PilulaDeFiltro ativo={quantas > 0}>{rotulo}</PilulaDeFiltro>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w={`${PAINEL.largura}px`} p={PAINEL.padding} borderRadius="md">
            <CamposDeData
              verificar={verificar}
              prazo={prazo}
              onVerificar={setVerificar}
              onPrazo={setPrazo}
              calendario={calendario}
              onCalendario={(qual, abre) => setCalendario(abre ? qual : null)}
            />
            <RodapeDeFiltro
              rotuloSecundario="Limpar datas"
              onSecundario={limpar}
              onAplicar={aplicar}
            />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
