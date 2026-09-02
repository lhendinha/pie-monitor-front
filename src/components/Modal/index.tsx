import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { BotaoNu } from "../BotaoNu";
/* ⚠️ Direto, e NUNCA pelo barril `../index`: `ModalDeConfirmacao` importa
   este arquivo de volta, e o ciclo passando pelo barril é a armadilha que
   `ModalDeTarefa` e `ModalDeDocumento` já comentam. Entre os dois arquivos o
   ciclo é inócuo -- os dois são `export default function`, içados, e a
   referência só acontece em tempo de render. */
import ModalDeConfirmacao from "../ModalDeConfirmacao";
import type { Descarte } from "../../types";

interface ModalProps {
  titulo: string;
  /** Uma linha de contexto embaixo do título -- tipicamente uma contagem.
   * Fica no cabeçalho porque ele não rola: assim a informação continua
   * visível quando o corpo do modal já rolou pra longe dela. */
  subtitulo?: string;
  onFechar: () => void;
  /** O que fazer quando alguém tenta fechar. Ver `Descarte`.
   *
   * 🔴 **Obrigatória.** Modal com formulário passa `{ mudou }`; modal de
   * leitura ou de confirmação passa `"semFormulario"`. Não há padrão, e é
   * essa a proteção: um modal novo não compila enquanto ninguém decidir. */
  descarte: Descarte;
  /** `wide` (760px) para os modais de formulário longo -- é a variante
   * `.modal.wide` do artifact. */
  largo?: boolean;
  /** Ações do rodapé. Ficam FORA da área que rola: no artifact
   * `.modal-foot` é irmão de `.modal-body`, não filho. Dentro, os botões
   * sobem junto com o conteúdo e somem da vista em formulário longo. */
  rodape?: ReactNode;
  /** Uma ação no CABEÇALHO, à esquerda do X.
   *
   * ⚠️ Existe porque o rodapé nem sempre serve: em `ModalDeMovimentacao` ele
   * é condicional de propósito (*"rodapé SÓ quando há pra onde ir;
   * `RodapeDeAcoes` vazio desenharia uma faixa cinza no pé do modal sem nada
   * dentro"*), e pôr uma ação lá o tornaria incondicional pra todo mundo.
   *
   * 🔴 Ela e o X vão dentro de um `Flex` próprio, e NÃO como irmãos diretos
   * do título: aquele `Flex` é `justify="space-between"` com dois filhos
   * (título e X), e um terceiro faria a ação flutuar no MEIO do cabeçalho,
   * longe do botão de fechar. */
  acaoNoCabecalho?: ReactNode;
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

/** As frases do diálogo de descarte, por caso.
 *
 * 🔴 Três textos, porque um só mentiria. "Alterações" não existe num modal de
 * criação; e nos que salvam na hora nada se perde além do texto digitado --
 * por isso aqueles passam `textoProprio`. */
const PERGUNTA_DE_DESCARTE = {
  edicao: {
    titulo: "Sair sem salvar?",
    mensagem: "As alterações que você fez serão perdidas.",
    sair: "Sair sem salvar",
    voltar: "Continuar editando",
  },
  criacao: {
    titulo: "Sair sem salvar?",
    mensagem: "Este cadastro ainda não foi salvo e será perdido.",
    sair: "Sair sem salvar",
    voltar: "Continuar preenchendo",
  },
} as const;

export default function Modal({ titulo, subtitulo, onFechar, descarte, largo, rodape, acaoNoCabecalho, children }: ModalProps) {
  const [perguntando, setPerguntando] = useState(false);

  /** O que TODO gesto de fechar chama -- Escape, cortina e X.
   *
   * ⚠️ Não é o `onFechar`: este pergunta antes, quando há o que perder. Quem
   * fecha de verdade é o `onFechar`, e ele continua sendo chamado direto pelo
   * formulário depois de salvar -- por isso salvar nunca dispara a pergunta. */
  function pedirParaFechar() {
    if (descarte !== "semFormulario" && descarte.mudou) {
      setPerguntando(true);
      return;
    }
    onFechar();
  }
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
  /* 🔴 O ref guarda a função GUARDADA, não o `onFechar` cru.
   *
   * E o `descarte` NÃO pode entrar nas dependências do listener, por dois
   * motivos que se somam. O primeiro é o já escrito acima: deps que mudam a
   * cada render devolvem o modal ao topo da pilha e invertem a ordem. O
   * segundo é pior e específico daqui: com deps `[]`, uma função capturada na
   * MONTAGEM enxergaria `mudou` congelado -- e na montagem ele é `false` por
   * construção, porque o retrato acabou de ser tirado. O Escape descartaria
   * SEMPRE, não de vez em quando.
   *
   * Com a função reescrita no ref a cada renderização, o listener sempre
   * chama a versão que enxerga o `mudou` de agora. */
  const pedirRef = useRef(pedirParaFechar);
  /* ⚠️ A escrita no ref vai num EFEITO, não no corpo do componente.
   *
   * Escrever `pedirRef.current` durante a renderização é o antipadrão
   * que o React Compiler proíbe ("Cannot access refs during render") -- ele
   * pode descartar e refazer uma renderização, e efeito colateral ali não é
   * garantido. Este efeito não tem deps de propósito: roda depois de toda
   * renderização, que é exatamente quando o callback pode ter mudado. */
  useEffect(() => {
    pedirRef.current = pedirParaFechar;
  });

  useEffect(() => {
    const meuLugar = Symbol("modal");
    pilhaDeModais.push(meuLugar);

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (pilhaDeModais[pilhaDeModais.length - 1] !== meuLugar) return;
      pedirRef.current();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      const onde = pilhaDeModais.indexOf(meuLugar);
      if (onde >= 0) pilhaDeModais.splice(onde, 1);
    };
  }, []);

  const pergunta =
    descarte !== "semFormulario"
      ? descarte.textoProprio ?? PERGUNTA_DE_DESCARTE[descarte.caso ?? "edicao"]
      : null;

  return (
    <>
    <Flex
      position="fixed"
      inset="0"
      zIndex="100"
      bg="rgba(15,25,35,.45)"
      align="flex-start"
      justify="center"
      p="5vh 20px"
      overflowY="auto"
      onClick={pedirParaFechar}
      /* 🔴 `inert` enquanto o diálogo está por cima, e resolve DOIS problemas
         de uma vez: o Tab deixa de passear pelo formulário de trás (não há
         armadilha de foco em lugar nenhum), e o X daqui some da árvore de
         acessibilidade -- senão haveria dois botões chamados "Fechar" no
         mesmo documento, que o `CONTEXT.md` proíbe. */
      {...(perguntando ? { inert: "" } : {})}
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
          {/* Ação e X num grupo só, à direita: o `Flex` de fora é
              `space-between` e precisa continuar com DOIS filhos -- título
              de um lado, ações do outro. Um terceiro filho direto jogaria a
              ação pro meio do cabeçalho. */}
          <Flex align="center" gap="8px" flexShrink={0}>
            {acaoNoCabecalho}
            {/* ⚠️ O X é sempre o ÚLTIMO. É o alvo que as pessoas procuram no
                canto, e inverter a ordem faria alguém fechar o modal
                querendo clicar na ação. */}
            <BotaoNu
              type="button"
              title="Fechar"
              aria-label="Fechar"
              onClick={pedirParaFechar}
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
        </Flex>
        <Box p="20px 22px" maxH="70vh" overflowY="auto">
          {children}
        </Box>
        {rodape}
      </Box>
    </Flex>

    {/* 🔴 IRMÃO da cortina, e não filho. Dentro dela, um clique no fundo do
        diálogo borbulharia até o `onClick` da cortina de fora -- o
        `stopPropagation` só existe na caixa branca. É a mesma razão que o
        `ModalDoQuadro` já documenta para o diálogo de exclusão dele.

        ⚠️ A pilha de Escape funciona porque este monta num commit POSTERIOR:
        entra por último, fica no topo, e o Escape aqui fecha só a pergunta. */}
    {perguntando && pergunta && (
      <ModalDeConfirmacao
        titulo={pergunta.titulo}
        mensagem={pergunta.mensagem}
        rotulo={pergunta.sair}
        rotuloDeCancelar={pergunta.voltar}

        onConfirmar={() => {
          setPerguntando(false);
          onFechar();
        }}
        onFechar={() => setPerguntando(false)}
      />
    )}
    </>
  );
}
