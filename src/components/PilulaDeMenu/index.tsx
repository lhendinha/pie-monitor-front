import { Menu, Portal } from "@chakra-ui/react";

/* Irmão direto, não pelo índice: este componente é exportado por ele, e
   importar de lá criaria um ciclo. */
import { PilulaDeFiltro } from "../PilulaDeFiltro";
import { OPCAO_DE_MENU, OPCAO_DE_MENU_ATIVA, PAINEL_DE_MENU } from "../../theme/menu";

interface Opcao {
  /** Não pode ser vazio: item de menu com `value=""` o zag não registra, e
   * a opção simplesmente não seleciona. */
  id: string;
  rotulo: string;
}

interface Props {
  opcoes: readonly Opcao[];
  selecionado: string;
  /** A pílula fica azul quando há filtro. Filtro ligado que parece
   * desligado faz a pessoa ver uma lista incompleta achando que vê tudo. */
  ativo: boolean;
  onEscolher: (id: string) => void;
}

/** Pílula da barra de filtros que abre um menu de escolha única.
 *
 * Três filtros do quadro têm exatamente esta forma (subgrupo, período,
 * pessoas), então o desenho vive num lugar só.
 */
export default function PilulaDeMenu({ opcoes, selecionado, ativo, onEscolher }: Props) {
  const atual = opcoes.find((o) => o.id === selecionado) ?? opcoes[0];

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <PilulaDeFiltro ativo={ativo}>{atual?.rotulo ?? ""}</PilulaDeFiltro>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content css={PAINEL_DE_MENU}>
            {opcoes.map((o) => (
              <Menu.Item
                key={o.id}
                value={o.id}
                onSelect={() => onEscolher(o.id)}
                css={o.id === selecionado ? { ...OPCAO_DE_MENU, ...OPCAO_DE_MENU_ATIVA } : OPCAO_DE_MENU}
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
