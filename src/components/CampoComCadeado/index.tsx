import { Box } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { IconeCadeado } from "../Icons";

interface CampoComCadeadoProps {
  /** O controle travado -- um `Input` `disabled`, um `Select` `desabilitado`.
   *
   * ⚠️ Quem desabilita é QUEM CHAMA, e não este componente: ele só desenha o
   * cadeado. Um wrapper que também travasse esconderia o `disabled` do
   * controle de quem lê o JSX, e o `Input` e o `Select` travam por props
   * diferentes. */
  children: ReactNode;
  /** Largura do envelope. Precisa acompanhar a do controle: o cadeado é
   * absoluto e ancora na borda direita DESTE `Box`, não na do campo.
   *
   * 🔴 Medido em Chrome: sem ela, um `Input` de 120px dentro de uma coluna
   * larga ganhava o cadeado boiando no vazio à direita, longe do campo que
   * ele tranca. Os campos que ocupam a coluna inteira não precisam passar. */
  largura?: string;
}

/** Um campo que existe para ser LIDO, com o cadeado que diz por quê.
 *
 * 🔴 **Nasceu de três cópias idênticas linha por linha** -- o e-mail do perfil
 * (`DadosDaConta`), o e-mail do membro (`EditarMembroForm`) e a inscrição em
 * edição (`ModalDaInscricao`). As três repetiam as mesmas doze linhas de
 * posicionamento absoluto, e a terceira foi escrita achando que era a segunda.
 *
 * ⚠️ **O cadeado não é enfeite: ele é a diferença entre "não muda" e "ainda
 * não dá para preencher".** Cinza sozinho comunica o segundo, e é por isso que
 * nenhum destes campos fica só desabilitado.
 *
 * ⚠️ **`pointerEvents: none`** porque o ícone fica POR CIMA do controle: sem
 * isto o clique morre nele em vez de cair no campo. Nos três usos de hoje o
 * campo está desabilitado de qualquer jeito -- o dia em que não estiver,
 * ninguém vai lembrar.
 *
 * ⚠️ **O controle é sempre um `Input`**, mesmo onde o campo editável seria um
 * `Select`: travado, um seletor ainda desenha a SETA, e ela disputaria o canto
 * com o cadeado. Um campo que não muda não precisa parecer um seletor -- e o
 * `Input` desabilitado com o valor dentro diz a mesma coisa sem a disputa.
 */
export default function CampoComCadeado({ children, largura }: CampoComCadeadoProps) {
  return (
    <Box position="relative" width={largura}>
      {children}
      <Box
        position="absolute"
        right="12px"
        top="50%"
        transform="translateY(-50%)"
        color="fg.subtle"
        pointerEvents="none"
        css={{ "& svg": { width: "15px", height: "15px" } }}
      >
        <IconeCadeado />
      </Box>
    </Box>
  );
}
