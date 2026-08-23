import { Menu, Portal } from "@chakra-ui/react";

import { PilulaDeFiltro } from "../../../../components";
import { OPCAO_DE_MENU, OPCAO_DE_MENU_ATIVA, PAINEL_DE_MENU } from "../../../../theme/menu";
import { TIPOS_DE_ENVIO } from "../../constants/historico";

interface Props {
  valor: string;
  onMudar: (valor: string) => void;
}

/** A pílula que escolhe entre Todos, Movimentações e Lembretes.
 *
 * Fica ativa (azul) sempre que houver filtro -- e como a tela abre em
 * Movimentações, ela já nasce assim. Filtro ligado que parece desligado faz
 * a pessoa ver uma lista incompleta achando que está vendo tudo. Pelo mesmo
 * motivo a opção escolhida fica realçada dentro do menu.
 */
export default function FiltroDeTipo({ valor, onMudar }: Props) {
  const atual = TIPOS_DE_ENVIO.find((t) => t.valor === valor) || TIPOS_DE_ENVIO[0];

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <PilulaDeFiltro ativo={valor !== ""}>{atual.rotulo}</PilulaDeFiltro>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content css={PAINEL_DE_MENU}>
            {TIPOS_DE_ENVIO.map((t) => (
              <Menu.Item
                key={t.id}
                /* O `id`, e não o `valor`: "Todos" tem valor vazio, e item
                   de menu com `value=""` o zag não registra -- ele nunca
                   selecionava. */
                value={t.id}
                onSelect={() => onMudar(t.valor)}
                css={t.valor === valor ? { ...OPCAO_DE_MENU, ...OPCAO_DE_MENU_ATIVA } : OPCAO_DE_MENU}
              >
                {t.rotulo}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
