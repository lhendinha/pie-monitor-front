import { Box, Stack } from "@chakra-ui/react";
import { useId, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import {
  Botao,
  BotaoDeCancelar,
  Campo,
  CampoDeSenha,
  Faixa,
  Modal,
  RodapeDeAcoes,
  useToast,
} from "../../../../components";
import { REGRA_DA_SENHA, TAMANHO_MINIMO_DA_SENHA } from "../../../../constants";
import { alterarMinhaSenha } from "../../../../services";
import { toastErroMutation } from "../../../../services/queryClient";

interface ModalDeSenhaProps {
  onFechar: () => void;
}

/** Troca de senha estando logado -- o único fluxo de senha que não passa
 * por e-mail.
 *
 * Exige a senha atual como prova: um access token roubado não pode virar
 * troca de senha sozinho. O servidor conta as tentativas erradas aqui
 * também, com chave própria, senão quem tivesse um token válido adivinharia
 * a senha atual à vontade, contornando o bloqueio do login.
 */
export default function ModalDeSenha({ onFechar }: ModalDeSenhaProps) {
  /** Liga o botão do rodapé ao `<form>` do corpo: eles são irmãos, não pai
   * e filho, porque o rodapé fica fora da área que rola. */
  const idFormulario = useId();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const toast = useToast();

  const curtaDemais = nova.length > 0 && nova.length < TAMANHO_MINIMO_DA_SENHA;
  const naoConfere = confirmacao.length > 0 && nova !== confirmacao;
  const podeEnviar =
    atual.length > 0 && nova.length >= TAMANHO_MINIMO_DA_SENHA && nova === confirmacao;

  const trocarMutation = useMutation({
    mutationFn: () => alterarMinhaSenha(atual, nova),
    onSuccess: () => {
      toast.sucesso("Senha alterada. As outras sessões vão cair.");
      onFechar();
    },
    onError: (err) => {
      setErro("Não foi possível alterar. Confira a senha atual.");
      toastErroMutation(toast, err, "Não foi possível alterar a senha.");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    trocarMutation.mutate();
  }

  return (
    <Modal
      descarte="semFormulario"
      titulo="Alterar senha atual"
      onFechar={onFechar}
      rodape={
        <RodapeDeAcoes>
          <BotaoDeCancelar />
          <Botao type="submit" form={idFormulario} disabled={trocarMutation.isPending || !podeEnviar}>
            {trocarMutation.isPending ? "Salvando…" : "Salvar"}
          </Botao>
        </RodapeDeAcoes>
      }
    >
      <form id={idFormulario} onSubmit={handleSubmit}>
        <Stack gap="0">
          {/* Dito ANTES, não depois: quem descobre que o celular caiu só
              depois de trocar a senha acha que alguma coisa quebrou. */}
          <Box mb="16px">
            <Faixa tom="aviso" aEsquerda>
              Trocar a senha desconecta suas outras sessões. Você continua conectado aqui.
            </Faixa>
          </Box>

          <Campo rotulo="Senha atual" para="senha-atual" obrigatorio erro={erro || undefined}>
            <CampoDeSenha
              id="senha-atual"
              valor={atual}
              onMudar={(v) => {
                setAtual(v);
                setErro("");
              }}
              placeholder="Digite sua senha atual"
              autoComplete="current-password"
              autoFocus
            />
          </Campo>

          <Campo
            rotulo="Nova senha"
            para="senha-nova"
            obrigatorio
            dica={REGRA_DA_SENHA}
            erro={curtaDemais ? REGRA_DA_SENHA : undefined}
          >
            <CampoDeSenha
              id="senha-nova"
              valor={nova}
              onMudar={setNova}
              placeholder="Digite sua nova senha"
              autoComplete="new-password"
            />
          </Campo>

          <Campo
            rotulo="Confirmação"
            para="senha-confirmacao"
            obrigatorio
            erro={naoConfere ? "As senhas não coincidem." : undefined}
          >
            <CampoDeSenha
              id="senha-confirmacao"
              valor={confirmacao}
              onMudar={setConfirmacao}
              placeholder="Confirme sua nova senha"
              autoComplete="new-password"
            />
          </Campo>
        </Stack>
      </form>
    </Modal>
  );
}
