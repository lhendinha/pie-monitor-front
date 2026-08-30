import { Box, Input } from "@chakra-ui/react";
import { Flex } from "@chakra-ui/react";

import { BotaoDeLink, Campo, IconeCadeado } from "../../../../components";
import { getEmail } from "../../../../services";

interface DadosDaContaProps {
  onAlterarSenha: () => void;
}

/** O que a pessoa NÃO edita nesta aba: o e-mail e a senha.
 *
 * ⚠️ **O e-mail é `Input disabled` com cadeado, e isso foi uma volta atrás
 * deliberada.** Cheguei a trocá-lo por `CampoDeLeitura` -- texto puro -- com o
 * argumento de que um input desabilitado pesa como se fosse editável. O
 * argumento valia quando tudo morava num cartão só, com um "Salvar" que
 * parecia governar o e-mail junto. Com as abas, o Salvar desta aba governa só
 * o nome, e o campo desabilitado volta a ser o que sempre foi: a forma que
 * todo mundo reconhece para "existe, é seu, e não se mexe aqui".
 *
 * ⚠️ O cadeado responde "por que não dá para editar?" ANTES de a pessoa
 * tentar clicar -- é ele que evita o clique frustrado.
 */
export default function DadosDaConta({ onAlterarSenha }: DadosDaContaProps) {
  const email = getEmail() || "";

  return (
    <>
      <Campo
        rotulo="E-mail"
        para="email-perfil"
        dica="O e-mail é o identificador da sua conta e não pode ser alterado."
      >
        <Box position="relative">
          <Input id="email-perfil" value={email} disabled pr="38px" />
          <Box
            position="absolute"
            right="12px"
            top="50%"
            transform="translateY(-50%)"
            color="fg.subtle"
            css={{ "& svg": { width: "15px", height: "15px" } }}
          >
            <IconeCadeado />
          </Box>
        </Box>
      </Campo>

      {/* Senha em modal, e não como campo: trocar senha é outra operação, com
          outra confirmação e outro risco. No mesmo formulário, um "Salvar" só
          ficaria ambíguo -- salvaria o quê? */}
      <Flex>
        <BotaoDeLink type="button" onClick={onAlterarSenha}>
          Alterar senha atual
        </BotaoDeLink>
      </Flex>
    </>
  );
}
