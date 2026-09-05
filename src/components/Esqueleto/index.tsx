import { Skeleton, Stack, VisuallyHidden } from "@chakra-ui/react";
import type { EsqueletoProps } from "./types";

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
export default function Esqueleto({ linhas = 3, altura = "56px" }: EsqueletoProps) {
  return (
    <>
      {/* ⚠️ O anúncio vive AQUI, junto do esqueleto, e não espalhado pelas
          telas. As barras são `aria-hidden` -- são forma, não conteúdo, e
          um leitor de tela percorrendo blocos vazios não informa nada. A
          justificativa antiga desse `aria-hidden` era que "as telas já
          dizem carregando… por escrito"; elas deixaram de dizer quando a
          frase saiu por ser redundante COM O ESQUELETO -- redundante pra
          quem enxerga, única fonte pra quem não. Sem esta linha, tirar o
          texto teria trocado ruído visual por silêncio total. */}
      <VisuallyHidden aria-live="polite">Carregando…</VisuallyHidden>
      <Stack gap="10px" aria-hidden="true">
        {Array.from({ length: linhas }).map((_, i) => (
          <Skeleton
            key={i}
            height={altura}
            borderRadius="md"
          />
        ))}
      </Stack>
    </>
  );
}
