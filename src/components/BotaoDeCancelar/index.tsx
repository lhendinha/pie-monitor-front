import { usePedirParaFechar } from "../../contexts/DescarteContext";
import Botao from "../Botao";
import type { BotaoDeCancelarProps } from "./types";

/** O "Cancelar" do rodapé de um modal de formulário.
 *
 * 🔴 **Não aceita `onClick`, e é essa a proteção.** Sem prop para ligar, não
 * há o que esquecer de ligar: ele pega o pedido de fechar do contexto do
 * `Modal`, que já passa pela guarda de descarte. Um `Botao` cru com
 * `onFechar` no rodapé fecharia direto e levaria o que foi digitado -- foi
 * assim que os quatro caminhos ficaram desiguais antes.
 *
 * ⚠️ Fora de um `Modal`, o hook lança. Erro na hora é melhor que um botão que
 * não faz nada.
 */
export default function BotaoDeCancelar({ desabilitado, children }: BotaoDeCancelarProps) {
  const pedirParaFechar = usePedirParaFechar();
  return (
    <Botao variante="ghost" onClick={pedirParaFechar} disabled={desabilitado} >
      {children ?? "Cancelar"}
    </Botao>
  );
}
