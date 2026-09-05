import { Box, Text } from "@chakra-ui/react";
import { components } from "react-select";
import type { GroupBase, MenuProps } from "react-select";

import { MARCA_CAMADA_FLUTUANTE } from "../../constants/camadaFlutuante";
import { DIVISORIA, PAINEL } from "../../theme/painelFiltro";
import RodapeDeFiltro from "../RodapeDeFiltro";
import { OpcaoDeLinha } from "../OpcaoDeLinha";
import { CampoDeBuscaDoPainel } from "./CampoDeBuscaDoPainel";
import { FaixaDeBusca, FalhaDoPainel } from "./EstadosDoPainel";
import type { OpcaoDeSelect } from "../../types";
import type { ExtrasDoMenu } from "./types";

/** Painel do filtro em chip, com a moldura que o artifact tem e o menu
 * padrão do react-select não: a caixa de busca, a linha "Todas as X" no
 * topo, a divisória, e (quando a escolha é múltipla) o rodapé com
 * Cancelar/Aplicar.
 *
 * O rodapé existe porque a seleção é MÚLTIPLA: aplicar a cada clique
 * dispararia uma busca por caixa marcada, e quem quer três situações faria
 * três requisições pra chegar onde queria.
 */
export function MenuDeFiltro(props: MenuProps<OpcaoDeSelect, boolean, GroupBase<OpcaoDeSelect>>) {
  const extras = props.selectProps as unknown as ExtrasDoMenu;
  const { onCancelar, onAplicar, onBusca, onFechar } = extras;

  return (
    <components.Menu {...props} innerProps={{ ...props.innerProps, ...MARCA_CAMADA_FLUTUANTE }}>
      {onBusca && (
        <CampoDeBuscaDoPainel
          valor={extras.busca ?? ""}
          onMudar={onBusca}
          placeholder={extras.placeholderBusca ?? "Buscar"}
          onEscape={onFechar ?? (() => {})}
        />
      )}

      {extras.comOpcaoTodas !== false && (
        <Box p={PAINEL.padding}>
          <OpcaoDeLinha ativa={extras.nenhumSelecionado} onClick={extras.onTodas}>
            {extras.rotuloTodas}
          </OpcaoDeLinha>
          <Box h="1px" bg="border.subtle" m={DIVISORIA.margem} />
        </Box>
      )}

      {/* 🔴 O aviso de falha CONVIVE com a lista, não a substitui. Esvaziar as
          opções pra abrir espaço pro aviso levaria junto as que não vieram
          do servidor: no filtro de pessoas, "Sem responsável" sumiria porque
          a lista de gente falhou. Uma opção local não tem por que sumir por
          causa de uma consulta remota. Quando não há mesmo nada, o aviso fica
          sozinho. */}
      {extras.erro && extras.onTentarDeNovo && (
        <FalhaDoPainel onTentarDeNovo={extras.onTentarDeNovo} />
      )}
      {extras.buscando && <FaixaDeBusca />}
      {/* ⚠️ A opacidade vai num invólucro, e não no `menuList`: é ele que
          rola, e mexer no estilo dele pela árvore do react-select exigiria
          um segundo componente customizado só pra isso. */}
      <Box opacity={extras.buscando ? 0.45 : 1} transition="opacity 120ms">
        {props.children}
      </Box>

      {/* 🔴 O corte tem que ser DITO. Uma lista truncada em silêncio se lê
          como lista inteira, e quem procura o que ficou de fora conclui que
          não existe -- a mesma mentira por omissão que a lista vazia sem
          motivo conta. */}
      {Boolean(extras.ocultos) && (
        <Text
          px="12px"
          py="7px"
          fontSize="12px"
          color="fg.subtle"
          borderTopWidth="1px"
          borderTopStyle="solid"
          borderTopColor="border.subtle"
        >
          {`+${extras.ocultos} não exibidos — digite mais pra refinar`}
        </Text>
      )}

      {onCancelar && onAplicar && (
        <RodapeDeFiltro
          rotuloSecundario="Cancelar"
          onSecundario={onCancelar}
          onAplicar={onAplicar}
        />
      )}
    </components.Menu>
  );
}
