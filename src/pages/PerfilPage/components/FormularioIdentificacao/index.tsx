import { Box, Flex, Input } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeLink,
  Campo,
  IconeCadeado,
  RodapeDeAcoes,
  RotuloDeSecao,
  useToast,
} from "../../../../components";
import { useSessaoContexto } from "../../../../contexts/SessaoContext";
import { atualizarMeuPerfil, getEmail } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";

interface FormularioIdentificacaoProps {
  onAlterarSenha: () => void;
}

/** Identificação da conta: apelido e e-mail.
 *
 * Não há consulta -- apelido e e-mail já estão na sessão, e ir à rede
 * buscar o que já está em mãos faria a tela piscar sem ganho.
 */
export default function FormularioIdentificacao({ onAlterarSenha }: FormularioIdentificacaoProps) {
  const email = getEmail() || "";
  // ⚠️ `apelidoSalvo` vem do CONTEXTO. Lido de `getApelido()` no render, o
  // React Compiler o congelava: depois de salvar, `mudou` continuava `true`
  // (o botão "Salvar" parecia não ter funcionado) e "Cancelar" devolvia o
  // nome ANTIGO, que já não era o do servidor.
  const { apelido: apelidoSalvo, trocarApelido } = useSessaoContexto();
  const [apelido, setApelido] = useState(apelidoSalvo);
  const toast = useToast();

  const salvarMutation = useMutation({
    mutationFn: () => atualizarMeuPerfil(apelido.trim()),
    onSuccess: () => {
      // Grava no storage E no estado da sessão -- é o estado que faz a
      // topbar e este formulário re-renderizarem com o nome novo.
      trocarApelido(apelido.trim());
      toast.sucesso("Perfil atualizado.");
    },
    onError: (err) => toastErroMutation(toast, err, "Não foi possível salvar."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    salvarMutation.mutate();
  }

  const mudou = apelido.trim() !== apelidoSalvo;

  return (
    <form onSubmit={handleSubmit}>
      <RotuloDeSecao primeiro>Informações pessoais</RotuloDeSecao>

      <Campo rotulo="Apelido" para="apelido-perfil" obrigatorio>
        <Input
          id="apelido-perfil"
          value={apelido}
          onChange={(e) => setApelido(e.target.value)}
          maxLength={512}
          placeholder="Como quer ser chamado"
        />
      </Campo>

      <RotuloDeSecao>Conta</RotuloDeSecao>

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

      {/* Senha em modal, e não como terceira seção: trocar senha é outra
          operação, com outra confirmação e outro risco. No mesmo formulário
          um "Salvar" só ficaria ambíguo -- salvaria o quê? */}
      <Flex>
        <BotaoDeLink type="button" onClick={onAlterarSenha}>
          Alterar senha atual
        </BotaoDeLink>
      </Flex>

      <Box mt="20px" borderTopWidth="1px" borderTopColor="border.subtle">
        <RodapeDeAcoes>
          <Botao
            variante="ghost"
            onClick={() => setApelido(apelidoSalvo)}
            disabled={salvarMutation.isPending || !mudou}
          >
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvarMutation.isPending || !apelido.trim() || !mudou}>
            {salvarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      </Box>
    </form>
  );
}
