import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { BotaoNu } from "../BotaoNu";

interface ModalProps {
  titulo: string;
  /** Uma linha de contexto embaixo do título -- tipicamente uma contagem.
   * Fica no cabeçalho porque ele não rola: assim a informação continua
   * visível quando o corpo do modal já rolou pra longe dela. */
  subtitulo?: string;
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
/** Pilha dos modais abertos. O último a montar é o de cima.
 *
 * 🔴 Sem ela, cada Modal registrava o próprio listener no `document` e TODOS
 * respondiam ao Escape. Abrir uma tarefa, clicar em "Excluir" (que monta o
 * ModalDeConfirmacao como irmão) e apertar Esc fechava os dois: quem só quis
 * desistir da exclusão perdia o formulário inteiro e as edições não salvas.
 */
const pilhaDeModais: symbol[] = [];

export default function Modal({ titulo, subtitulo, onFechar, largo, rodape, children }: ModalProps) {
  // Esc fecha -- é o que se espera de qualquer diálogo, e sem isso quem
  // navega por teclado fica preso dentro dele. Mas só o de CIMA fecha.
  /* 🔴 O efeito roda UMA vez, e o `onFechar` atual vem de um ref.
   *
   * Com `[onFechar]` nas dependências, um `onFechar` com identidade nova a
   * cada render fazia o modal ABERTO sair e voltar pro TOPO da pilha --
   * invertendo a ordem. Um diálogo de confirmação por cima passaria a
   * perder o Escape pro formulário de baixo, que é exatamente o que a pilha
   * existe pra impedir.
   *
   * ⚠️ Os chamadores passam `onFechar` de arrow INLINE -- por exemplo
   * `SubgruposPage` faz `onFechar={() => setVendoMembrosDe(null)}` num
   * wrapper que repassa pro Modal. Se essa identidade muda a cada render
   * depende do React Compiler memoizar a arrow, e eu NÃO verifiquei essa
   * garantia: a versão anterior deste comentário afirmava que "nenhum
   * chamador dispara isso porque o Compiler memoiza", o que era suposição
   * apresentada como fato.
   *
   * Depender de uma otimização de compilador pra manter uma invariante de
   * ordenação é frágil de qualquer forma. Com deps vazias, a posição na
   * pilha passa a depender só de montagem e desmontagem -- que é o que ela
   * representa -- e a pergunta sobre o Compiler deixa de importar. */
  const onFecharRef = useRef(onFechar);
  /* ⚠️ A escrita no ref vai num EFEITO, não no corpo do componente.
   *
   * `onFecharRef.current = onFechar` durante a renderização é o antipadrão
   * que o React Compiler proíbe ("Cannot access refs during render") -- ele
   * pode descartar e refazer uma renderização, e efeito colateral ali não é
   * garantido. Este efeito não tem deps de propósito: roda depois de toda
   * renderização, que é exatamente quando o callback pode ter mudado. */
  useEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    const meuLugar = Symbol("modal");
    pilhaDeModais.push(meuLugar);

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (pilhaDeModais[pilhaDeModais.length - 1] !== meuLugar) return;
      onFecharRef.current();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      const onde = pilhaDeModais.indexOf(meuLugar);
      if (onde >= 0) pilhaDeModais.splice(onde, 1);
    };
  }, []);

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
          <Box>
            <Heading as="h2" fontSize="16.5px" fontWeight="800">
              {titulo}
            </Heading>
            {subtitulo && (
              <Text fontSize="12px" color="fg.subtle" mt="2px">
                {subtitulo}
              </Text>
            )}
          </Box>
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
