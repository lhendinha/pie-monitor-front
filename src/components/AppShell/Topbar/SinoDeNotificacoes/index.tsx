import { Box, Flex, Popover, Portal, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import BotaoDeIcone from "../../../BotaoDeIcone";
import BotaoDeTexto from "../../../BotaoDeTexto";
import EstadoDeErro from "../../../EstadoDeErro";
import EstadoVazio from "../../../EstadoVazio";
import Esqueleto from "../../../Esqueleto";
import { IconeSino } from "../../../Icons";
import {
  LARGURA_DO_PAINEL_DO_SINO,
  MAXIMO_NO_BADGE,
} from "../../../../constants";
import { useNotificacoes } from "../../../../hooks/useNotificacoes";
import { destinoDaNotificacao } from "../../../../utils/notificacao";
import type { Notificacao } from "../../../../types";
import LinhaDeNotificacao from "./LinhaDeNotificacao";

/** O sino da barra superior: badge com a contagem e painel com a lista.
 *
 * ⚠️ O ponto de aviso agora só aparece quando HÁ não lidas. Antes ele era
 * fixo no desenho (o artifact traz o botão com o ponto sempre aceso, e o
 * sino era inerte) -- um aviso permanente que não avisa nada treina a
 * pessoa a ignorá-lo.
 */
export default function SinoDeNotificacoes() {
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();
  const {
    notificacoes,
    naoLidas,
    carregando,
    erro,
    recarregar,
    marcarLida,
    marcarTodasLidas,
    marcandoTodas,
  } = useNotificacoes();

  function abrir(notificacao: Notificacao) {
    const destino = destinoDaNotificacao(notificacao);
    if (!destino) return;
    // Marca lida ANTES de navegar: o painel fecha e o componente desmonta,
    // e uma chamada disparada depois disso não teria onde reportar erro.
    if (!notificacao.lida) marcarLida(notificacao.notificacao_id);
    setAberto(false);
    navigate(destino);
  }

  return (
    <Popover.Root
      open={aberto}
      onOpenChange={(e) => setAberto(e.open)}
      /* Mesmas travas dos outros painéis: sem `unmountOnExit` o painel
         fechado fica plantado na tela, porque a animação de saída não roda
         com `preflight: false`. */
      lazyMount
      unmountOnExit
      positioning={{ placement: "bottom-end", gutter: 8 }}
    >
      <Popover.Trigger asChild>
        <BotaoDeIcone rotulo="Notificações" comAviso={naoLidas > 0}>
          <IconeSino />
        </BotaoDeIcone>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content w={`${LARGURA_DO_PAINEL_DO_SINO}px`} borderRadius="md" overflow="hidden">
            <Flex
              align="center"
              justify="space-between"
              p="12px 14px"
              borderBottomWidth="1px"
              borderBottomStyle="solid"
              borderBottomColor="border.subtle"
            >
              <Text fontSize="14px" fontWeight="800">
                Notificações
                {naoLidas > 0 && (
                  <Text as="span" color="fg.brand" ml="6px">
                    ({naoLidas > MAXIMO_NO_BADGE ? `${MAXIMO_NO_BADGE}+` : naoLidas})
                  </Text>
                )}
              </Text>
              {naoLidas > 0 && (
                <BotaoDeTexto onClick={() => marcarTodasLidas()}>
                  {marcandoTodas ? "Marcando…" : "Marcar todas como lidas"}
                </BotaoDeTexto>
              )}
            </Flex>

            <Box maxH="420px" overflowY="auto">
              {carregando ? (
                <Box p="14px">
                  <Esqueleto linhas={3} />
                </Box>
              ) : erro ? (
                <EstadoDeErro
                  mensagem="Não foi possível carregar as notificações."
                  onTentarDeNovo={recarregar}
                />
              ) : notificacoes.length === 0 ? (
                <EstadoVazio mensagem="Nenhuma notificação." />
              ) : (
                notificacoes.map((n, indice) => (
                  <LinhaDeNotificacao
                    key={n.notificacao_id}
                    notificacao={n}
                    onAbrir={destinoDaNotificacao(n) ? () => abrir(n) : undefined}
                    ultima={indice === notificacoes.length - 1}
                  />
                ))
              )}
            </Box>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
