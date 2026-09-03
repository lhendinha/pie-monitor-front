import { Input, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";

import { Botao, BotaoDeLink, Campo, CartaoDeAutenticacao, Faixa } from "../../components";
import { useToast } from "../../contexts/ToastContext";
import { solicitarRecuperacaoSenha } from "../../services";
import { emailValido } from "../../utils";

interface EsqueciSenhaPageProps {
  onVoltar: () => void;
}

export default function EsqueciSenhaPage({ onVoltar }: EsqueciSenhaPageProps) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const toast = useToast();

  const limpo = email.trim().toLowerCase();
  const emailRuim = limpo.length > 0 && !emailValido(limpo);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await solicitarRecuperacaoSenha(limpo);
      // A MESMA resposta, exista ou não o e-mail -- o servidor também não
      // revela. Uma mensagem diferente pra endereço inexistente diria a
      // quem estiver testando endereços quais têm conta aqui.
      setEnviado(true);
    } catch (err) {
      toast.erro(err instanceof Error ? err.message : "Não foi possível processar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CartaoDeAutenticacao
      titulo="Recuperar senha"
      subtitulo={
        enviado
          ? undefined
          : "Informe o e-mail da sua conta pra receber um link de redefinição de senha."
      }
    >
      {enviado ? (
        <Faixa tom="ok">
          Se esse e-mail existir, você vai receber um link de recuperação em instantes.
        </Faixa>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* ⚠️ Sem `obrigatorio`, e de propósito: é o ÚNICO campo da tela e
              o Enviar já fica desligado sem ele. Não há dispensável ao lado
              para o asterisco separar. */}
          <Campo
            rotulo="E-mail"
            para="email-recuperacao"
            erro={emailRuim ? "E-mail inválido." : undefined}
          >
            <Input
              id="email-recuperacao"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </Campo>

          <Botao
            type="submit"
            w="100%"
            justifyContent="center"
            disabled={enviando || !limpo || emailRuim}
          >
            {enviando ? "Enviando…" : "Enviar link"}
          </Botao>
        </form>
      )}

      <Stack align="center" mt="16px">
        <Text>
          <BotaoDeLink type="button" onClick={onVoltar}>
            Voltar pro login
          </BotaoDeLink>
        </Text>
      </Stack>
    </CartaoDeAutenticacao>
  );
}
