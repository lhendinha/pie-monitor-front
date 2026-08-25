import { Box } from "@chakra-ui/react";
import { components } from "react-select";
import type { ClearIndicatorProps, GroupBase } from "react-select";

import { IconeX } from "../Icons";
import type { OpcaoDeSelect } from "../../types";

/** O X que limpa o filtro sem precisar abrir o painel.
 *
 * 🔴 A linha "Todas as X" no topo do painel já limpava, mas exigia ABRIR pra
 * descobrir -- e nas de escolha múltipla o caminho que sobrava era desmarcar
 * uma a uma.
 *
 * Vale nas de escolha ÚNICA também. Cheguei a defender que ali seria
 * redundante, já que "Todos os X" faz a mesma coisa; é exatamente o mesmo
 * argumento que eu tinha usado A FAVOR dele no múltiplo, e ele derruba os
 * dois casos ou nenhum. Se o X existe pra não precisar abrir, deixá-lo em
 * metade das pílulas mantém o problema na outra metade.
 *
 * ⚠️ Fica DENTRO da pílula, e não colado por fora: o `ClearIndicator` é
 * filho do controle, que é a própria pílula. Numa tentativa anterior (no
 * protótipo) ele era um `<button>` dentro do `<button>` da pílula -- HTML
 * inválido, que o parser desaninha, e o X aparecia solto ao lado dela.
 */
export function BotaoDeLimpar(
  props: ClearIndicatorProps<OpcaoDeSelect, boolean, GroupBase<OpcaoDeSelect>>,
) {
  return (
    <components.ClearIndicator
      {...props}
      innerProps={{ ...props.innerProps, "aria-label": "Limpar filtro", title: "Limpar" }}
    >
      <Box
        display="flex"
        alignItems="center"
        opacity={0.65}
        _hover={{ opacity: 1 }}
        css={{ "& svg": { width: "12px", height: "12px" } }}
      >
        <IconeX />
      </Box>
    </components.ClearIndicator>
  );
}
