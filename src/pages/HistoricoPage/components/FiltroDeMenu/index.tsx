import { Menu, Portal } from "@chakra-ui/react";

import { PilulaDeFiltro } from "../../../../components";
import { OPCAO_DE_MENU, OPCAO_DE_MENU_ATIVA, PAINEL_DE_MENU } from "../../../../theme/menu";
import type { FiltroDeMenuProps } from "./types";

/** Pílula de filtro com menu, no formato do Histórico.
 *
 * 🔴 Nasceu de `FiltroDeTipo`, generalizada quando o Histórico ganhou mais
 * dois filtros (falha e período) em 26/08/2026. Três cópias do mesmo menu
 * divergiriam no primeiro ajuste de estilo -- e o realce da opção escolhida,
 * que é o que impede a pessoa de achar que não há filtro ligado, some numa
 * cópia sem ninguém notar.
 *
 * ⚠️ **Filtro ligado tem que PARECER ligado.** A pílula fica acesa sempre
 * que o valor difere do neutro -- e a tela abre em "Movimentações", já
 * filtrada. Filtro invisível faz a pessoa ver uma lista incompleta achando
 * que está vendo tudo. Pelo mesmo motivo a opção escolhida é realçada dentro
 * do menu.
 */
export default function FiltroDeMenu<T extends string | number | boolean>({
  opcoes,
  valor,
  onMudar,
}: FiltroDeMenuProps<T>) {
  const neutro = opcoes[0];
  const atual = opcoes.find((o) => o.valor === valor) ?? neutro;

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <PilulaDeFiltro ativo={valor !== neutro.valor}>{atual.rotulo}</PilulaDeFiltro>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content css={PAINEL_DE_MENU}>
            {opcoes.map((o) => (
              <Menu.Item
                key={o.id}
                value={o.id}
                onSelect={() => onMudar(o.valor)}
                css={o.valor === valor ? { ...OPCAO_DE_MENU, ...OPCAO_DE_MENU_ATIVA } : OPCAO_DE_MENU}
              >
                {o.rotulo}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
