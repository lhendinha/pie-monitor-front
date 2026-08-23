import { Popover, Portal } from "@chakra-ui/react";
import { useState } from "react";

import { SELETOR_CALENDARIO } from "../../constants/camadaFlutuante";
import {
  PERIODOS_FUTUROS,
  PERIODOS_PASSADOS,
  PERIODO_PERSONALIZADO,
  PERIODO_TODOS,
} from "../../constants/periodos";
import { PAINEL } from "../../theme/painelFiltro";
import { formatarData } from "../../utils";
import type { Intervalo } from "../../utils/periodo";
import { PilulaDeFiltro } from "../PilulaDeFiltro";
import IntervaloPersonalizado from "./IntervaloPersonalizado";
import ListaDeOpcoes from "./ListaDeOpcoes";

interface Props {
  /** Id de `PERIODOS_*`, `PERIODO_TODOS` ou `PERIODO_PERSONALIZADO`. */
  periodoId: string;
  /** Só é lido quando `periodoId` é o personalizado. */
  intervaloPersonalizado?: Intervalo;
  onMudar: (periodoId: string, intervalo?: Intervalo) => void;
}

/** O rótulo da pílula. Personalizado mostra as duas datas em vez de
 * "Personalizado": o nome do filtro não diz que período é, e o número de um
 * intervalo escolhido a dedo é a única coisa que responde isso. */
function rotuloDoPeriodo(periodoId: string, intervalo?: Intervalo): string {
  if (periodoId === PERIODO_PERSONALIZADO && intervalo?.de && intervalo?.ate) {
    return `${formatarData(intervalo.de)} – ${formatarData(intervalo.ate)}`;
  }
  const achado = [...PERIODOS_FUTUROS, ...PERIODOS_PASSADOS].find((o) => o.id === periodoId);
  return achado?.rotulo ?? "Todos os períodos";
}

/** Filtro de período: a lista fixa do artifact mais um intervalo a dedo.
 *
 * Vive em `src/components`, e não dentro do Kanban, porque o artifact usa a
 * mesma lista em dois lugares (o `scope` de `kanban` e o de `agenda`) -- a
 * Agenda consome daqui quando existir.
 *
 * É `Popover` e não `Menu` porque o painel tem DOIS estados: a lista e o
 * calendário. Um menu fecha ao escolher um item, e "Definir período…" não é
 * uma escolha, é uma troca de conteúdo dentro do mesmo painel -- é assim no
 * artifact (`panel.innerHTML = rangeHTML`).
 */
export default function SeletorDePeriodo({
  periodoId,
  intervaloPersonalizado,
  onMudar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"lista" | "personalizado">("lista");

  function aoMudarAbertura(estaAberto: boolean) {
    // Reabrir sempre volta pra lista: deixar o calendário montado de uma
    // vez anterior esconde as opções fixas atrás de uma tela que a pessoa
    // não pediu agora.
    if (estaAberto) setModo("lista");
    setAberto(estaAberto);
  }

  function escolher(id: string) {
    onMudar(id);
    setAberto(false);
  }

  function aplicarIntervalo(intervalo: Intervalo) {
    onMudar(PERIODO_PERSONALIZADO, intervalo);
    setAberto(false);
  }

  return (
    <Popover.Root
      open={aberto}
      onOpenChange={(e) => aoMudarAbertura(e.open)}
      /* ⚠️ O calendário é portalado pra `document.body`, então clicar num
         dia conta como clique FORA e fecharia o painel inteiro antes de dar
         pra clicar em Aplicar. `persistentElements` diz ao Popover que
         aquele pedaço solto também é dele. */
      persistentElements={[() => document.querySelector(SELETOR_CALENDARIO)]}
      /* ⚠️ Sem `unmountOnExit` o painel fechado continua no DOM com
         `display:flex` e `opacity:1` -- a moldura fica plantada na tela. A
         animação de saída que deveria escondê-la não roda com
         `preflight: false`. */
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-start", gutter: PAINEL.margemTopo }}
    >
      <Popover.Trigger asChild>
        <PilulaDeFiltro ativo={periodoId !== PERIODO_TODOS}>
          {rotuloDoPeriodo(periodoId, intervaloPersonalizado)}
        </PilulaDeFiltro>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w={`${PAINEL.largura}px`} p={PAINEL.padding} borderRadius="md">
            {modo === "lista" ? (
              <ListaDeOpcoes
                selecionado={periodoId}
                onEscolher={escolher}
                onAbrirPersonalizado={() => setModo("personalizado")}
              />
            ) : (
              <IntervaloPersonalizado
                de={intervaloPersonalizado?.de ?? ""}
                ate={intervaloPersonalizado?.ate ?? ""}
                onAplicar={aplicarIntervalo}
                onVoltar={() => setModo("lista")}
              />
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
