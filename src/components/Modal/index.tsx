import { Box, Flex, Heading } from "@chakra-ui/react";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { BotaoNu } from "../BotaoNu";

interface Props {
  titulo: string;
  onFechar: () => void;
  /** `wide` (760px) para os modais de formulário longo -- é a variante
   * `.modal.wide` do artifact. */
  largo?: boolean;
  /** Ações do rodapé. Ficam FORA da área que rola: no artifact
   * `.modal-foot` é irmão de `.modal-body`, não filho. Dentro, os botões
   * sobem junto com o conteúdo e somem da vista em formulário longo. */
  rodape?: ReactNode;
  children: ReactNode;
}

/** Modal do sistema (`.overlay` + `.modal` do artifact).
 *
 * A cortina rola (`overflow-y: auto` com `align-items: flex-start`): modal
 * mais alto que a janela precisa rolar por fora, senão o rodapé com os
 * botões fica inalcançável em tela baixa.
 */
export default function Modal({ titulo, onFechar, largo, rodape, children }: Props) {
  // Esc fecha -- é o que se espera de qualquer diálogo, e sem isso quem
  // navega por teclado fica preso dentro dele.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <Flex
      position="fixed"
      inset="0"
      zIndex="100"
      bg="rgba(15,25,35,.45)"
      align="flex-start"
      justify="center"
      p="5vh 20px"
      overflowY="auto"
      onClick={onFechar}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        w="100%"
        maxW={largo ? "760px" : "560px"}
        m="auto"
        bg="bg.surface"
        borderRadius="lg"
        boxShadow="md"
        onClick={(e) => e.stopPropagation()}
      >
        <Flex
          align="center"
          justify="space-between"
          p="18px 22px"
          borderBottomWidth="1px"
          borderBottomColor="border.subtle"
        >
          <Heading as="h2" fontSize="16.5px" fontWeight="800">
            {titulo}
          </Heading>
          <BotaoNu
            type="button"
            title="Fechar"
            aria-label="Fechar"
            onClick={onFechar}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="34px"
            h="34px"
            borderRadius="full"
            color="fg.muted"
            _hover={{ bg: "border.subtle", color: "fg" }}
          >
            ✕
          </BotaoNu>
        </Flex>
        <Box p="20px 22px" maxH="70vh" overflowY="auto">
          {children}
        </Box>
        {rodape}
      </Box>
    </Flex>
  );
}
