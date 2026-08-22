import { Skeleton, Stack } from "@chakra-ui/react";

interface Props {
  /** Quantas barras. O padrão serve a uma tabela; um cartão pequeno pede
   * menos. */
  linhas?: number;
  /** Altura de cada barra. O padrão aproxima a linha de uma tabela. */
  altura?: string;
}

/** Espaço reservado enquanto os dados carregam.
 *
 * Usa o `Skeleton` do Chakra por baixo -- ele já resolve a animação e o
 * `prefers-reduced-motion`, que a versão anterior tratava à mão.
 *
 * O artifact não desenha estado de carregamento (é uma demo estática), por
 * isso as medidas vêm do que ele carrega: barras da altura de uma linha de
 * tabela, no raio e na cor de borda do sistema. A versão antiga usava o
 * creme da paleta pré-Argos (`--paper-dim`), e destoava de tudo.
 */
export default function Esqueleto({ linhas = 3, altura = "56px" }: Props) {
  return (
    /* `aria-hidden`: é forma, não conteúdo. Sem isso o leitor de tela
       percorre blocos vazios; quem depende dele ouve o resultado quando
       ele chegar, e as telas já dizem "carregando…" por escrito. */
    <Stack gap="10px" aria-hidden="true">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton
          key={i}
          height={altura}
          borderRadius="md"
        />
      ))}
    </Stack>
  );
}
